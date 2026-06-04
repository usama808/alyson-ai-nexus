import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { emailService } from "../../services/email.service.js";
import { buildMeta, parsePagination, sendSuccess } from "../../utils/api-response.js";
import { z } from "zod";

export const subscribersRoutes = Router();

subscribersRoutes.use(authenticate);

subscribersRoutes.get("/", async (req: Request, res: Response, next) => {
  try {
    const cityId = Number(req.query.cityId);
    if (!cityId) {
      sendSuccess(res, [], buildMeta(1, 20, 0));
      return;
    }
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await emailService.listSubscribers(
      cityId,
      skip,
      limit,
      req.query.status as string | undefined,
    );
    sendSuccess(res, items, buildMeta(page, limit, total));
  } catch (e) {
    next(e);
  }
});

subscribersRoutes.post("/", requireRoles("admin", "editor"), async (req, res, next) => {
  try {
    const body = z
      .object({
        cityId: z.number().int().positive(),
        email: z.string().email(),
        source: z.string().default("api"),
      })
      .parse(req.body);
    const subscriber = await emailService.addSubscriber(body.cityId, body.email, body.source);
    sendSuccess(res, subscriber, undefined, 201);
  } catch (e) {
    next(e);
  }
});
