import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export class ArticleRepository {
  findMany(args: Prisma.ArticleFindManyArgs) {
    return prisma.article.findMany(args);
  }

  findUnique(id: number) {
    return prisma.article.findUnique({
      where: { id },
      include: {
        city: true,
        category: true,
        content: true,
        sources: true,
        metrics: true,
        aiGenerations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  count(where: Prisma.ArticleWhereInput) {
    return prisma.article.count({ where });
  }

  create(data: Prisma.ArticleCreateInput) {
    return prisma.article.create({ data });
  }

  update(id: number, data: Prisma.ArticleUpdateInput) {
    return prisma.article.update({ where: { id }, data });
  }

  delete(id: number) {
    return prisma.article.delete({ where: { id } });
  }
}

export const articleRepository = new ArticleRepository();
