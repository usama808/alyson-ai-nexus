import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../middleware/auth.js";
import { analyticsService } from "../../services/analytics.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { z } from "zod";

const trackEventSchema = z.object({
  eventType: z.string().min(1),
  articleId: z.number().int().positive().optional(),
  cityId: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const analyticsRoutes = Router();

analyticsRoutes.post("/events", async (req: Request, res: Response, next) => {
  try {
    const body = trackEventSchema.parse(req.body);
    const event = await analyticsService.trackEvent(body);
    sendSuccess(res, event, undefined, 201);
  } catch (e) {
    next(e);
  }
});

analyticsRoutes.use(authenticate);

analyticsRoutes.get("/dashboard", async (req, res, next) => {
  try {
    const data = await analyticsService.getDashboard(
      req.query.cityId ? Number(req.query.cityId) : undefined,
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

analyticsRoutes.get("/subscribers/growth", async (req, res, next) => {
  try {
    const data = await analyticsService.getSubscriberGrowth(
      req.query.cityId ? Number(req.query.cityId) : undefined,
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
