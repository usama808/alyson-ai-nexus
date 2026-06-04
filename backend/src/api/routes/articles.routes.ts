import { Router } from "express";
import { articlesController } from "../../controllers/articles.controller.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  aiGenerateSchema,
  articleListQuerySchema,
  createArticleSchema,
  updateArticleSchema,
} from "../../validators/articles.validator.js";
import { idParamSchema } from "../../validators/common.validator.js";

export const articlesRoutes = Router();

articlesRoutes.use(authenticate);

articlesRoutes.get("/", validate(articleListQuerySchema, "query"), (req, res, next) =>
  articlesController.list(req, res).catch(next),
);
articlesRoutes.get("/:id", validate(idParamSchema, "params"), (req, res, next) =>
  articlesController.get(req, res).catch(next),
);
articlesRoutes.post("/", requireRoles("admin", "editor"), validate(createArticleSchema), (req, res, next) =>
  articlesController.create(req, res).catch(next),
);
articlesRoutes.patch("/:id", requireRoles("admin", "editor"), validate(updateArticleSchema), (req, res, next) =>
  articlesController.update(req, res).catch(next),
);
articlesRoutes.delete("/:id", requireRoles("admin"), validate(idParamSchema, "params"), (req, res, next) =>
  articlesController.remove(req, res).catch(next),
);
articlesRoutes.post(
  "/:id/ai/generate",
  requireRoles("admin", "editor"),
  validate(idParamSchema, "params"),
  validate(aiGenerateSchema),
  (req, res, next) => articlesController.generateAi(req, res).catch(next),
);
articlesRoutes.get("/:id/ai", validate(idParamSchema, "params"), (req, res, next) =>
  articlesController.listAiGenerations(req, res).catch(next),
);
