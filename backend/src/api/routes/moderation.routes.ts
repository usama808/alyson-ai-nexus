import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { moderationService } from "../../services/moderation.service.js";
import { articlesService } from "../../services/articles.service.js";
import { sendSuccess, parsePagination, buildMeta } from "../../utils/api-response.js";
import { z } from "zod";

export const moderationRoutes = Router();

moderationRoutes.use(authenticate, requireRoles("admin", "reviewer", "editor"));

moderationRoutes.get("/queue", async (req: Request, res: Response, next) => {
  try {
    const items = await moderationService.listQueue(
      req.query.cityId ? Number(req.query.cityId) : undefined,
      req.query.status as string | undefined,
    );
    sendSuccess(
      res,
      items.map((q) => ({
        ...q,
        article: articlesService.formatArticle(q.article),
      })),
    );
  } catch (e) {
    next(e);
  }
});

moderationRoutes.post("/:articleId/approve", async (req, res, next) => {
  try {
    const article = await moderationService.approve(
      Number(req.params.articleId),
      req.user!.userId,
      req.body.notes,
    );
    sendSuccess(res, articlesService.formatArticle(article));
  } catch (e) {
    next(e);
  }
});

moderationRoutes.post("/:articleId/reject", async (req, res, next) => {
  try {
    await moderationService.reject(
      Number(req.params.articleId),
      req.user!.userId,
      req.body.notes,
    );
    sendSuccess(res, await articlesService.getById(Number(req.params.articleId)));
  } catch (e) {
    next(e);
  }
});

moderationRoutes.post("/:articleId/escalate", async (req, res, next) => {
  try {
    const result = await moderationService.escalate(
      Number(req.params.articleId),
      req.body.notes ?? "Escalated for senior review",
    );
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

moderationRoutes.post("/:articleId/publish", requireRoles("admin", "editor"), async (req, res, next) => {
  try {
    const article = await moderationService.publish(Number(req.params.articleId));
    sendSuccess(res, articlesService.formatArticle(article));
  } catch (e) {
    next(e);
  }
});
