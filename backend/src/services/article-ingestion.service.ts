import { prisma } from "../config/database.js";
import { uniqueSlug } from "../utils/slug.js";
import { aiOrchestratorService } from "./ai-orchestrator.service.js";
import { logger } from "../utils/logger.js";

const CATEGORY_KEYWORDS: { slug: string; keywords: string[] }[] = [
  { slug: "local-sports", keywords: ["sport", "game", "team", "nfl", "nba", "mlb", "soccer", "mariners", "lakers"] },
  { slug: "real-estate", keywords: ["housing", "rent", "apartment", "real estate", "home prices", "mortgage"] },
  { slug: "business", keywords: ["business", "startup", "company", "economy", "jobs", "market"] },
  { slug: "trending-national", keywords: ["viral", "tiktok", "trending", "celebrity"] },
  { slug: "local-news", keywords: [] },
];

export class ArticleIngestionService {
  async ingestFromRawPosts(cityId: number, limit = 15) {
    const city = await prisma.city.findUniqueOrThrow({ where: { id: cityId } });
    const defaultCategory = await prisma.category.findFirst({ where: { slug: "local-news" } });
    if (!defaultCategory) throw new Error("local-news category missing — run seed");

    const rawPosts = await prisma.socialPostRaw.findMany({
      where: { cityId },
      orderBy: { scrapedAt: "desc" },
      take: limit * 2,
    });

    const created: number[] = [];
    const skipped: string[] = [];

    for (const post of rawPosts) {
      if (created.length >= limit) break;

      const existingSource = await prisma.articleSource.findFirst({
        where: { sourceUrl: post.postUrl },
      });
      if (existingSource) {
        skipped.push(post.postUrl);
        continue;
      }

      const title = this.extractTitle(post.postText);
      if (!title || title.length < 12) continue;

      const category = await this.resolveCategory(title, defaultCategory.id);
      const slug = await uniqueSlug(title, async (s) => {
        const exists = await prisma.article.findFirst({ where: { cityId, slug: s } });
        return !!exists;
      });

      const article = await prisma.article.create({
        data: {
          cityId,
          categoryId: category.id,
          title,
          slug,
          status: "draft",
        },
      });

      const body = post.postText.length > title.length ? post.postText : `${title}\n\nLocal coverage for ${city.name}.`;

      await prisma.articleContent.create({
        data: {
          articleId: article.id,
          content: body,
          seoDescription: `${title} — ${city.name}, ${city.state} local news.`,
        },
      });

      await prisma.articleSource.create({
        data: {
          articleId: article.id,
          platform: post.platform,
          sourceUrl: post.postUrl,
          originalAuthor: post.platform,
        },
      });

      try {
        await aiOrchestratorService.generate({
          articleId: article.id,
          generationType: "summary",
          prompt: `Summarize this local news story for ${city.name}, ${city.state}:\n\n${body.slice(0, 2000)}`,
          sourceText: body,
        });
      } catch (err) {
        logger.warn({ articleId: article.id, err }, "AI summary on ingest failed");
      }

      created.push(article.id);
    }

    await this.refreshCityArticleCount(cityId);
    return { cityId, cityName: city.name, created: created.length, skipped: skipped.length };
  }

  async ingestAllActiveCities(perCity = 8) {
    const cities = await prisma.city.findMany({ where: { status: "active" } });
    const results = [];
    for (const city of cities) {
      try {
        results.push(await this.ingestFromRawPosts(city.id, perCity));
      } catch (err) {
        logger.warn({ cityId: city.id, err }, "Ingestion failed for city");
      }
    }
    return results;
  }

  private extractTitle(postText: string): string {
    const firstLine = postText.split("\n")[0]?.trim() ?? "";
    return firstLine.replace(/^\[Mock.*?\]\s*/i, "").slice(0, 280);
  }

  private async resolveCategory(title: string, fallbackId: number) {
    const lower = title.toLowerCase();
    for (const rule of CATEGORY_KEYWORDS) {
      if (rule.keywords.some((k) => lower.includes(k))) {
        const cat = await prisma.category.findUnique({ where: { slug: rule.slug } });
        if (cat) return cat;
      }
    }
    return prisma.category.findUniqueOrThrow({ where: { id: fallbackId } });
  }

  private async refreshCityArticleCount(cityId: number) {
    const totalArticles = await prisma.article.count({ where: { cityId } });
    await prisma.cityMetric.upsert({
      where: { cityId },
      create: {
        cityId,
        views: 0,
        clicks: 0,
        avgCtr: 0,
        revenue: 0,
        subscriberCount: 0,
        totalArticles,
        pendingReviews: 0,
        updatedAt: new Date(),
      },
      update: { totalArticles, updatedAt: new Date() },
    });
  }
}

export const articleIngestionService = new ArticleIngestionService();
