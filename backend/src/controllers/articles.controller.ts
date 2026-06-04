import type { Request, Response } from "express";
import { articlesService } from "../services/articles.service.js";
import { aiOrchestratorService } from "../services/ai-orchestrator.service.js";
import { buildMeta, parsePagination, sendSuccess } from "../utils/api-response.js";

export class ArticlesController {
  async list(req: Request, res: Response) {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await articlesService.list({
      cityId: req.query.cityId as number | undefined,
      status: req.query.status as string | undefined,
      categoryId: req.query.categoryId as number | undefined,
      search: req.query.search as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
      skip,
      take: limit,
    });
    sendSuccess(res, items, buildMeta(page, limit, total));
  }

  async get(req: Request, res: Response) {
    const article = await articlesService.getById(Number(req.params.id));
    sendSuccess(res, article);
  }

  async create(req: Request, res: Response) {
    const article = await articlesService.create(req.body);
    sendSuccess(res, article, undefined, 201);
  }

  async update(req: Request, res: Response) {
    const article = await articlesService.update(
      Number(req.params.id),
      req.body,
      req.user?.userId,
    );
    sendSuccess(res, article);
  }

  async remove(req: Request, res: Response) {
    await articlesService.delete(Number(req.params.id));
    sendSuccess(res, { deleted: true });
  }

  async generateAi(req: Request, res: Response) {
    const result = await aiOrchestratorService.generate({
      articleId: Number(req.params.id),
      ...req.body,
    });
    sendSuccess(res, result);
  }

  async listAiGenerations(req: Request, res: Response) {
    const items = await aiOrchestratorService.listByArticle(Number(req.params.id));
    sendSuccess(res, items);
  }
}

export const articlesController = new ArticlesController();
