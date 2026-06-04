import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { uniqueSlug } from "../utils/slug.js";
import { fromFrontendStatus, toFrontendStatus } from "../utils/article-status.js";

export class ArticlesService {
  async list(params: {
    cityId?: number;
    status?: string;
    categoryId?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    skip: number;
    take: number;
  }) {
    const statusFilter = params.status
      ? { status: params.status.includes("_") ? params.status : fromFrontendStatus(params.status) }
      : {};

    const where = {
      cityId: params.cityId,
      categoryId: params.categoryId,
      ...statusFilter,
      ...(params.search ? { title: { contains: params.search } } : {}),
    };

    const include = {
      city: true,
      category: true,
      content: true,
      sources: true,
      metrics: true,
      aiGenerations: { orderBy: { createdAt: "desc" as const }, take: 1 },
      reviewQueue: true,
    };

    if (params.sortBy === "aiConfidence") {
      const all = await prisma.article.findMany({ where, include });
      const dir = params.sortOrder === "asc" ? 1 : -1;
      all.sort((a, b) => {
        const av = a.aiGenerations[0]?.confidenceScore ?? 0;
        const bv = b.aiGenerations[0]?.confidenceScore ?? 0;
        return (av - bv) * dir;
      });
      const total = all.length;
      const page = all.slice(params.skip, params.skip + params.take);
      return {
        items: page.map((a) => this.formatArticle(a)),
        total,
      };
    }

    const orderBy = this.resolveSort(params.sortBy, params.sortOrder);

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        include,
      }),
      prisma.article.count({ where }),
    ]);

    return {
      items: items.map((a) => this.formatArticle(a)),
      total,
    };
  }

  async getById(id: number) {
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        city: true,
        category: true,
        content: true,
        sources: true,
        metrics: true,
        rankingScore: true,
        aiGenerations: { orderBy: { createdAt: "desc" } },
        reviewQueue: true,
        versions: { orderBy: { versionNumber: "desc" }, take: 20 },
      },
    });
    if (!article) throw new AppError("Article not found", "NOT_FOUND", 404);
    return this.formatArticle(article, true);
  }

  async create(data: {
    cityId: number;
    categoryId: number;
    title: string;
    content?: string;
    platform?: string;
    sourceUrl?: string;
    status?: string;
  }) {
    const slug = await uniqueSlug(data.title, async (s) => {
      const exists = await prisma.article.findFirst({
        where: { cityId: data.cityId, slug: s },
      });
      return !!exists;
    });

    const status = data.status
      ? data.status.includes("_")
        ? data.status
        : fromFrontendStatus(data.status)
      : "draft";

    const article = await prisma.article.create({
      data: {
        cityId: data.cityId,
        categoryId: data.categoryId,
        title: data.title,
        slug,
        status,
      },
    });

    if (data.content) {
      await prisma.articleContent.create({
        data: { articleId: article.id, content: data.content },
      });
    }

    if (data.platform && data.sourceUrl) {
      await prisma.articleSource.create({
        data: {
          articleId: article.id,
          platform: data.platform,
          sourceUrl: data.sourceUrl,
        },
      });
    }

    return this.getById(article.id);
  }

  async update(
    id: number,
    data: Partial<{
      title: string;
      categoryId: number;
      status: string;
      content: string;
      seoDescription: string;
      newsletterHtml: string;
    }>,
    userId?: number,
  ) {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) throw new AppError("Article not found", "NOT_FOUND", 404);

    if (data.status) {
      const status = data.status.includes("_")
        ? data.status
        : fromFrontendStatus(data.status);
      await prisma.article.update({ where: { id }, data: { status } });
    }

    if (data.title || data.categoryId) {
      await prisma.article.update({
        where: { id },
        data: {
          title: data.title,
          categoryId: data.categoryId,
        },
      });
    }

    if (data.content || data.seoDescription || data.newsletterHtml) {
      await prisma.articleContent.upsert({
        where: { articleId: id },
        create: {
          articleId: id,
          content: data.content ?? "",
          seoDescription: data.seoDescription,
          newsletterHtml: data.newsletterHtml,
        },
        update: {
          content: data.content,
          seoDescription: data.seoDescription,
          newsletterHtml: data.newsletterHtml,
        },
      });

      if (data.content && userId) {
        const versionCount = await prisma.articleVersion.count({ where: { articleId: id } });
        await prisma.articleVersion.create({
          data: {
            articleId: id,
            versionNumber: versionCount + 1,
            content: data.content,
            seoDescription: data.seoDescription,
            changeType: "human_edit",
            userId,
          },
        });
      }
    }

    return this.getById(id);
  }

  async delete(id: number) {
    await prisma.article.delete({ where: { id } });
  }

  async schedule(id: number, publishAt: Date) {
    return prisma.article.update({
      where: { id },
      data: { status: "approved", publishedAt: publishAt },
    });
  }

  private resolveSort(sortBy?: string, sortOrder: "asc" | "desc" = "desc") {
    const map: Record<string, object> = {
      title: { title: sortOrder },
      publishedAt: { publishedAt: sortOrder },
      createdAt: { createdAt: sortOrder },
      status: { status: sortOrder },
    };
    if (sortBy === "engagement") {
      return { metrics: { engagement: sortOrder } };
    }
    if (sortBy === "ctr") {
      return { metrics: { ctr: sortOrder } };
    }
    if (sortBy === "clicks" || sortBy === "revenue") {
      return { metrics: { clicks: sortOrder } };
    }
    return map[sortBy ?? "createdAt"] ?? { createdAt: sortOrder };
  }

  formatArticle(
    article: {
      id: number;
      title: string;
      slug: string;
      status: string;
      publishedAt: Date | null;
      createdAt: Date;
      city: { name: string };
      category: { name: string };
      sources?: { platform: string; sourceUrl: string }[];
      metrics?: {
        ctr: number;
        clicks: number;
        engagement: number;
      } | null;
      aiGenerations?: { confidenceScore: number }[];
      reviewQueue?: unknown;
      content?: {
        content: string;
        seoDescription: string | null;
        newsletterHtml: string | null;
      } | null;
    },
    detailed = false,
  ) {
    const aiConfidence = article.aiGenerations?.[0]?.confidenceScore ?? 0;
    const clicks = article.metrics?.clicks ?? 0;
    const badges: string[] = [];
    const engagement = article.metrics?.engagement ?? 0;
    if ((article.metrics?.ctr ?? 0) >= 25 || engagement >= 80) badges.push("Trending");
    if (clicks >= 5000) badges.push("High Revenue");
    if (aiConfidence >= 0.9) badges.push("Viral");
    const raw = article as { status?: string; publishedAt?: Date | null };
    if (
      raw.status === "published" &&
      raw.publishedAt &&
      new Date(raw.publishedAt) > new Date(Date.now() - 86400000)
    ) {
      badges.push("Breaking");
    }

    const base = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      city: article.city.name,
      category: article.category.name,
      source: (article.sources?.[0]?.platform ?? "Unknown") as string,
      sourceUrl: article.sources?.[0]?.sourceUrl ?? null,
      status: toFrontendStatus(article.status),
      ctr: article.metrics?.ctr ?? 0,
      clicks,
      revenue: Math.round(clicks * 0.85),
      engagement: article.metrics?.engagement ?? 0,
      aiConfidence,
      publishedAt: article.publishedAt?.toISOString().slice(0, 10) ?? article.createdAt.toISOString().slice(0, 10),
      badges: badges.length ? badges : undefined,
    };

    if (!detailed) return base;
    return {
      ...base,
      content: article.content?.content ?? "",
      seoDescription: article.content?.seoDescription ?? "",
      newsletterHtml: article.content?.newsletterHtml ?? "",
      reviewQueue: article.reviewQueue,
    };
  }
}

export const articlesService = new ArticlesService();
