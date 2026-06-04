import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { settingsService } from "../../services/settings.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { z } from "zod";

export const settingsRoutes = Router();

settingsRoutes.use(authenticate);

settingsRoutes.get("/", async (_req, res, next) => {
  try {
    sendSuccess(res, await settingsService.getAll());
  } catch (e) {
    next(e);
  }
});

settingsRoutes.patch("/:key", requireRoles("admin"), async (req: Request, res: Response, next) => {
  try {
    const body = z.object({ value: z.unknown(), description: z.string().optional() }).parse(req.body);
    const key = String(req.params.key);
    const setting = await settingsService.set(key, body.value, body.description);
    sendSuccess(res, setting);
  } catch (e) {
    next(e);
  }
});
