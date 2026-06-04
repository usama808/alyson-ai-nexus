import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { emailService } from "../../services/email.service.js";
import { emailQueue, defaultJobOptions, QUEUE_NAMES } from "../../config/queues.js";
import { systemJobsService } from "../../services/system-jobs.service.js";
import { buildMeta, parsePagination, sendSuccess } from "../../utils/api-response.js";
import { z } from "zod";

export const emailRoutes = Router();

emailRoutes.use(authenticate);

emailRoutes.get("/campaigns", async (req: Request, res: Response, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await emailService.listCampaigns(
      req.query.cityId ? Number(req.query.cityId) : undefined,
      skip,
      limit,
    );
    sendSuccess(
      res,
      items.map((c) => ({
        id: c.id,
        title: c.title,
        city: c.city.name,
        type: c.campaignType,
        sent: c.sentCount,
        open: c.openRate,
        click: c.clickRate,
        revenue: Math.round(c.sentCount * c.clickRate * 0.12),
        status: c.status,
        createdAt: c.createdAt,
      })),
      buildMeta(page, limit, total),
    );
  } catch (e) {
    next(e);
  }
});

emailRoutes.post("/campaigns", requireRoles("admin", "editor"), async (req, res, next) => {
  try {
    const body = z
      .object({
        cityId: z.number().int().positive(),
        title: z.string().min(3),
        campaignType: z.string(),
        scheduledAt: z.coerce.date().optional(),
      })
      .parse(req.body);
    const campaign = await emailService.createCampaign(body);
    sendSuccess(res, campaign, undefined, 201);
  } catch (e) {
    next(e);
  }
});

emailRoutes.post("/campaigns/:id/send", requireRoles("admin"), async (req, res, next) => {
  try {
    const jobRecord = await systemJobsService.create({
      jobType: "email_send",
      queueName: QUEUE_NAMES.EMAIL,
      payload: { campaignId: Number(req.params.id) },
    });
    await emailQueue.add(
      "send-campaign",
      { campaignId: Number(req.params.id), systemJobId: jobRecord.id },
      defaultJobOptions,
    );
    sendSuccess(res, { queued: true, systemJobId: jobRecord.id }, undefined, 202);
  } catch (e) {
    next(e);
  }
});

emailRoutes.post("/track/open", async (req, res, next) => {
  try {
    const body = z.object({ cityId: z.number(), campaignId: z.number() }).parse(req.body);
    await emailService.trackOpen(body.cityId, body.campaignId);
    sendSuccess(res, { tracked: true });
  } catch (e) {
    next(e);
  }
});

emailRoutes.post("/track/click", async (req, res, next) => {
  try {
    const body = z
      .object({
        cityId: z.number(),
        campaignId: z.number(),
        articleId: z.number().optional(),
      })
      .parse(req.body);
    await emailService.trackClick(body.cityId, body.campaignId, body.articleId);
    sendSuccess(res, { tracked: true });
  } catch (e) {
    next(e);
  }
});
