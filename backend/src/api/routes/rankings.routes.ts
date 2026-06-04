import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { rankingService } from "../../services/ranking.service.js";
import { rankingQueue, defaultJobOptions, QUEUE_NAMES } from "../../config/queues.js";
import { systemJobsService } from "../../services/system-jobs.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { validate } from "../../middleware/validate.js";
import { z } from "zod";

const overrideSchema = z.object({
  cityId: z.number().int().positive(),
  articleId: z.number().int().positive(),
  position: z.number().int().min(1).max(10),
});

export const rankingsRoutes = Router();

rankingsRoutes.use(authenticate);

rankingsRoutes.get("/city/:cityId", async (req: Request, res: Response, next) => {
  try {
    const slots = await rankingService.getHomepage(Number(req.params.cityId));
    sendSuccess(res, slots);
  } catch (e) {
    next(e);
  }
});

rankingsRoutes.post("/recalculate", requireRoles("admin"), async (req, res, next) => {
  try {
    const cityId = req.body.cityId as number | undefined;
    if (cityId) {
      const result = await rankingService.recalculateCity(cityId);
      sendSuccess(res, result);
      return;
    }
    const jobRecord = await systemJobsService.create({
      jobType: "ranking_recalculate_all",
      queueName: QUEUE_NAMES.RANKING,
      payload: {},
    });
    await rankingQueue.add("recalculate-all", { systemJobId: jobRecord.id }, defaultJobOptions);
    sendSuccess(res, { queued: true, systemJobId: jobRecord.id });
  } catch (e) {
    next(e);
  }
});

rankingsRoutes.post(
  "/override",
  requireRoles("admin", "editor"),
  validate(overrideSchema),
  async (req, res, next) => {
    try {
      const slot = await rankingService.setManualOverride(
        req.body.cityId,
        req.body.articleId,
        req.body.position,
      );
      sendSuccess(res, slot);
    } catch (e) {
      next(e);
    }
  },
);
