import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { scrapingService } from "../../services/scraping.service.js";
import { scrapingQueue, defaultJobOptions, QUEUE_NAMES } from "../../config/queues.js";
import { systemJobsService } from "../../services/system-jobs.service.js";
import { buildMeta, parsePagination, sendSuccess } from "../../utils/api-response.js";
import { z } from "zod";

export const scrapingRoutes = Router();

scrapingRoutes.use(authenticate, requireRoles("admin", "editor"));

scrapingRoutes.get("/posts", async (req: Request, res: Response, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await scrapingService.listRawPosts(
      req.query.cityId ? Number(req.query.cityId) : undefined,
      req.query.platform as string | undefined,
      skip,
      limit,
    );
    sendSuccess(res, items, buildMeta(page, limit, total));
  } catch (e) {
    next(e);
  }
});

scrapingRoutes.post("/run", async (req, res, next) => {
  try {
    const body = z.object({ cityId: z.number().int().positive() }).parse(req.body);
    const jobRecord = await systemJobsService.create({
      jobType: "scrape_city",
      queueName: QUEUE_NAMES.SCRAPING,
      payload: body,
      cityId: body.cityId,
    });
    await scrapingQueue.add("scrape-city", { ...body, systemJobId: jobRecord.id }, defaultJobOptions);
    sendSuccess(res, { queued: true, systemJobId: jobRecord.id }, undefined, 202);
  } catch (e) {
    next(e);
  }
});

scrapingRoutes.post("/run-all", requireRoles("admin"), async (_req, res, next) => {
  try {
    const jobRecord = await systemJobsService.create({
      jobType: "scrape_all_cities",
      queueName: QUEUE_NAMES.SCRAPING,
      payload: {},
    });
    await scrapingQueue.add("scrape-all", { systemJobId: jobRecord.id }, defaultJobOptions);
    sendSuccess(res, { queued: true, systemJobId: jobRecord.id }, undefined, 202);
  } catch (e) {
    next(e);
  }
});
