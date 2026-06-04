import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { integrationsService } from "../../services/integrations.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { z } from "zod";

export const integrationsRoutes = Router();

integrationsRoutes.use(authenticate);

integrationsRoutes.get("/", async (_req, res, next) => {
  try {
    sendSuccess(res, await integrationsService.list());
  } catch (e) {
    next(e);
  }
});

integrationsRoutes.post(
  "/:id/credentials",
  requireRoles("admin"),
  async (req: Request, res: Response, next) => {
    try {
      const body = z.object({ secret: z.string().min(8) }).parse(req.body);
      await integrationsService.upsertCredential(Number(req.params.id), body.secret);
      await integrationsService.updateStatus(Number(req.params.id), "connected");
      sendSuccess(res, { saved: true });
    } catch (e) {
      next(e);
    }
  },
);

integrationsRoutes.post("/:id/sync", requireRoles("admin"), async (req, res, next) => {
  try {
    sendSuccess(res, await integrationsService.sync(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
});
