import { Router } from "express";
import type { Request, Response } from "express";
import { articlesService } from "../../services/articles.service.js";
import { citiesService } from "../../services/cities.service.js";
import { scrapingService } from "../../services/scraping.service.js";
import { rankingService } from "../../services/ranking.service.js";
import {
  getRankingWeights,
  setRankingWeights,
  isAutoRankEnabled,
  setAutoRankEnabled,
  type RankingWeights,
} from "../../services/ranking-weights.js";
import { fromFrontendStatus } from "../../utils/article-status.js";
import { buildMeta, parsePagination, sendSuccess } from "../../utils/api-response.js";
import { env } from "../../config/env.js";
import { sendError } from "../../utils/api-response.js";
import { getAiStatus } from "../../config/ai-config.js";
import { normalizeStateCode } from "../../utils/us-states.js";
import { aiOrchestratorService } from "../../services/ai-orchestrator.service.js";
import { aiGenerateSchema } from "../../validators/articles.validator.js";
import { pipelineService } from "../../services/pipeline.service.js";

export const feedRoutes = Router();

function allowPublicFeed(_req: Request, res: Response, next: () => void) {
  if (env.NODE_ENV === "development" || env.ALLOW_PUBLIC_FEED) {
    next();
    return;
  }
  sendError(res, "Public feed disabled", "FORBIDDEN", 403);
}

feedRoutes.use(allowPublicFeed);

feedRoutes.get("/ai/status", async (_req, res, next) => {
  try {
    sendSuccess(res, getAiStatus());
  } catch (e) {
    next(e);
  }
});

feedRoutes.get("/pipeline", async (_req, res, next) => {
  try {
    sendSuccess(res, await pipelineService.getVisualization());
  } catch (e) {
    next(e);
  }
});

feedRoutes.post("/cities", async (req, res, next) => {
  try {
    const body = req.body as {
      name?: string;
      state?: string;
      subdomain?: string;
      population?: number;
      status?: "active" | "paused";
    };
    if (!body.name || body.name.length < 2) {
      sendError(res, "City name is required (min 2 characters)", "VALIDATION", 400);
      return;
    }
    const stateCode = body.state ? normalizeStateCode(body.state) : null;
    if (!stateCode) {
      sendError(res, "Select a valid US state (e.g. Colorado or CO)", "VALIDATION", 400);
      return;
    }
    if (!body.subdomain || body.subdomain.length < 3) {
      sendError(res, "Subdomain is required", "VALIDATION", 400);
      return;
    }
    const population = Number(body.population);
    if (!Number.isFinite(population) || population < 0) {
      sendError(res, "Population must be a non-negative number", "VALIDATION", 400);
      return;
    }
    const city = await citiesService.create({
      name: body.name.trim(),
      state: stateCode,
      subdomain: body.subdomain.trim(),
      population: Math.floor(population),
      status: body.status ?? "active",
    });
    sendSuccess(res, city, undefined, 201);
  } catch (e) {
    next(e);
  }
});

feedRoutes.get("/cities", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortBy = (req.query.sortBy as string) || "name";
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";
    const { items, total } = await citiesService.list({
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      skip,
      take: limit,
      sortBy: sortBy as import("../../services/cities.service.js").CitySortField,
      sortOrder,
    });
    sendSuccess(res, items, buildMeta(page, limit, total));
  } catch (e) {
    next(e);
  }
});

feedRoutes.get("/articles", async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: (req.query.limit as string) ?? "50",
    });

    let status = req.query.status as string | undefined;
    if (status && status !== "all" && !status.includes("_")) {
      status = fromFrontendStatus(status);
    }

    const { items, total } = await articlesService.list({
      cityId: req.query.cityId ? Number(req.query.cityId) : undefined,
      status: status === "all" ? undefined : status,
      search: req.query.search as string | undefined,
      sortBy: (req.query.sortBy as string) ?? "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") ?? "desc",
      skip,
      take: limit,
    });

    sendSuccess(res, items, buildMeta(page, limit, total));
  } catch (e) {
    next(e);
  }
});

feedRoutes.get("/articles/:id", async (req, res, next) => {
  try {
    sendSuccess(res, await articlesService.getById(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
});

feedRoutes.post("/articles/:id/ai/generate", async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);
    if (!Number.isFinite(articleId) || articleId < 1) {
      sendError(res, "Invalid article id", "VALIDATION", 400);
      return;
    }
    const body = aiGenerateSchema.parse(req.body);
    const result = await aiOrchestratorService.generate({
      articleId,
      ...body,
    });
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

feedRoutes.get("/rankings/weights", async (_req, res, next) => {
  try {
    const weights = await getRankingWeights();
    const autoRank = await isAutoRankEnabled();
    sendSuccess(res, { weights, autoRank });
  } catch (e) {
    next(e);
  }
});

feedRoutes.put("/rankings/weights", async (req, res, next) => {
  try {
    const body = req.body as RankingWeights & { autoRank?: boolean };
    const weights = await setRankingWeights({
      ctr: Number(body.ctr),
      engagement: Number(body.engagement),
      freshness: Number(body.freshness),
      revenue: Number(body.revenue),
    });
    if (typeof body.autoRank === "boolean") {
      await setAutoRankEnabled(body.autoRank);
    }
    sendSuccess(res, { weights, autoRank: await isAutoRankEnabled() });
  } catch (e) {
    next(e);
  }
});

feedRoutes.get("/rankings", async (req, res, next) => {
  try {
    const cityId = req.query.cityId ? Number(req.query.cityId) : undefined;
    let weightsOverride: RankingWeights | undefined;
    if (req.query.weights && typeof req.query.weights === "string") {
      weightsOverride = JSON.parse(req.query.weights) as RankingWeights;
    }
    const ranked = await rankingService.listRanked(cityId, weightsOverride);
    sendSuccess(res, ranked);
  } catch (e) {
    next(e);
  }
});

feedRoutes.post("/rankings/recalculate", async (req, res, next) => {
  try {
    const cityId = req.body?.cityId ? Number(req.body.cityId) : undefined;
    const weights = req.body?.weights as RankingWeights | undefined;
    if (weights) await setRankingWeights(weights);

    if (cityId) {
      const result = await rankingService.recalculateCity(cityId, weights);
      const ranked = await rankingService.listRanked(cityId, weights);
      sendSuccess(res, { ...result, ranked });
      return;
    }
    await rankingService.recalculateAll(weights);
    const ranked = await rankingService.listRanked(undefined, weights);
    sendSuccess(res, { ranked });
  } catch (e) {
    next(e);
  }
});

feedRoutes.post("/refresh", async (req, res, next) => {
  try {
    const cityId = req.body?.cityId ? Number(req.body.cityId) : undefined;
    if (cityId) {
      const result = await scrapingService.runCityScrape(cityId);
      sendSuccess(res, result);
      return;
    }
    const results = await scrapingService.refreshAllCities();
    sendSuccess(res, { cities: results });
  } catch (e) {
    next(e);
  }
});
