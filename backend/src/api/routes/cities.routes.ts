import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { citiesService } from "../../services/cities.service.js";
import { buildMeta, parsePagination, sendSuccess } from "../../utils/api-response.js";
import { paginationSchema, idParamSchema } from "../../validators/common.validator.js";
import { z } from "zod";
import { normalizeStateCode } from "../../utils/us-states.js";

const stateSchema = z
  .string()
  .min(2)
  .refine((s) => normalizeStateCode(s) !== null, "Invalid US state");

const createCitySchema = z.object({
  name: z.string().min(2),
  state: stateSchema,
  subdomain: z.string().min(3),
  population: z.number().int().nonnegative(),
  status: z.enum(["active", "paused"]).optional(),
});

export const citiesRoutes = Router();

citiesRoutes.use(authenticate);

citiesRoutes.get("/", validate(paginationSchema, "query"), async (req: Request, res: Response, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await citiesService.list({
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      skip,
      take: limit,
    });
    sendSuccess(res, items, buildMeta(page, limit, total));
  } catch (e) {
    next(e);
  }
});

citiesRoutes.get("/:id", validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    sendSuccess(res, await citiesService.getById(Number(req.params.id)));
  } catch (e) {
    next(e);
  }
});

citiesRoutes.post("/", requireRoles("admin"), validate(createCitySchema), async (req, res, next) => {
  try {
    sendSuccess(res, await citiesService.create(req.body), undefined, 201);
  } catch (e) {
    next(e);
  }
});

citiesRoutes.patch("/:id", requireRoles("admin", "editor"), validate(idParamSchema, "params"), async (req, res, next) => {
  try {
    sendSuccess(res, await citiesService.update(Number(req.params.id), req.body));
  } catch (e) {
    next(e);
  }
});
