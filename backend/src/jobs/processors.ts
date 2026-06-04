import { prisma } from "../config/database.js";
import { aiOrchestratorService } from "../services/ai-orchestrator.service.js";
import { emailService } from "../services/email.service.js";
import { rankingService } from "../services/ranking.service.js";
import { scrapingService } from "../services/scraping.service.js";
import { systemJobsService } from "../services/system-jobs.service.js";
import { logger } from "../utils/logger.js";
import type { GenerationType } from "../services/ai-orchestrator.service.js";

export async function processScrapeCity(data: { cityId: number; systemJobId?: number }) {
  if (data.systemJobId) await systemJobsService.markActive(data.systemJobId);
  try {
    const result = await scrapingService.runCityScrape(data.cityId);
    if (data.systemJobId) await systemJobsService.markCompleted(data.systemJobId, result as Record<string, unknown>);
    return result;
  } catch (err) {
    if (data.systemJobId) {
      await systemJobsService.markFailed(
        data.systemJobId,
        err instanceof Error ? err.message : String(err),
      );
    }
    throw err;
  }
}

export async function processScrapeAll(data: { systemJobId?: number }) {
  if (data.systemJobId) await systemJobsService.markActive(data.systemJobId);
  const cities = await prisma.city.findMany({ where: { status: "active" } });
  const results = [];
  for (const city of cities) {
    try {
      results.push(await scrapingService.runCityScrape(city.id));
    } catch (err) {
      logger.warn({ cityId: city.id, err }, "City scrape failed");
    }
  }
  if (data.systemJobId) await systemJobsService.markCompleted(data.systemJobId, { cities: results.length });
  return results;
}

export async function processAiGenerate(data: {
  articleId: number;
  generationType: GenerationType;
  prompt: string;
  sourceText?: string;
  systemJobId?: number;
}) {
  if (data.systemJobId) await systemJobsService.markActive(data.systemJobId);
  try {
    const result = await aiOrchestratorService.generate(data);
    if (data.systemJobId) await systemJobsService.markCompleted(data.systemJobId, { generationId: result.generation.id });
    return result;
  } catch (err) {
    if (data.systemJobId) {
      await systemJobsService.markFailed(
        data.systemJobId,
        err instanceof Error ? err.message : String(err),
      );
    }
    throw err;
  }
}

export async function processRankingRecalculate(data: { systemJobId?: number }) {
  if (data.systemJobId) await systemJobsService.markActive(data.systemJobId);
  try {
    const result = await rankingService.recalculateAll();
    if (data.systemJobId) await systemJobsService.markCompleted(data.systemJobId, { cities: result.length });
    return result;
  } catch (err) {
    if (data.systemJobId) {
      await systemJobsService.markFailed(
        data.systemJobId,
        err instanceof Error ? err.message : String(err),
      );
    }
    throw err;
  }
}

export async function processEmailSend(data: { campaignId: number; systemJobId?: number }) {
  if (data.systemJobId) await systemJobsService.markActive(data.systemJobId);
  try {
    const result = await emailService.sendCampaign(data.campaignId);
    if (data.systemJobId) await systemJobsService.markCompleted(data.systemJobId, result as Record<string, unknown>);
    return result;
  } catch (err) {
    if (data.systemJobId) {
      await systemJobsService.markFailed(
        data.systemJobId,
        err instanceof Error ? err.message : String(err),
      );
    }
    throw err;
  }
}
