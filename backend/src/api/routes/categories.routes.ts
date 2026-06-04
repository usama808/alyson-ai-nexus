import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../config/database.js";
import { sendSuccess } from "../../utils/api-response.js";

export const categoriesRoutes = Router();

categoriesRoutes.use(authenticate);

categoriesRoutes.get("/", async (_req: Request, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    sendSuccess(res, categories);
  } catch (e) {
    next(e);
  }
});
