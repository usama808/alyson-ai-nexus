import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { systemJobsService } from "../../services/system-jobs.service.js";
import { buildMeta, parsePagination, sendSuccess } from "../../utils/api-response.js";

export const jobsRoutes = Router();

jobsRoutes.use(authenticate, requireRoles("admin"));

jobsRoutes.get("/", async (req: Request, res: Response, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await systemJobsService.list(
      req.query.queueName as string | undefined,
      req.query.status as string | undefined,
      skip,
      limit,
    );
    sendSuccess(res, items, buildMeta(page, limit, total));
  } catch (e) {
    next(e);
  }
});
