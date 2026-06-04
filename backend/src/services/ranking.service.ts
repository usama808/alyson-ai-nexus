import { prisma } from "../config/database.js";
import { cacheDel, cacheGet, cacheSet } from "../config/cache.js";
import {
  getRankingWeights,
  normalizeWeights,
  type RankingWeights,
} from "./ranking-weights.js";

const FRESHNESS_HALF_LIFE_HOURS = 48;
const TOP_SLOTS = 10;

type ArticleForRanking = {
  id: number;
  title: string;
  publishedAt: Date | null;
  createdAt: Date;
  city: { id: number; name: string };
  category: { name: string };
  metrics: {
    ctr: number;
    clicks: number;
    engagement: number;
  } | null;
  aiGenerations?: { confidenceScore: number }[];
};

export type RankedArticleRow = {
  id: number;
  title: string;
  city: string;
  cityId: number;
  category: string;
  ctr: number;
  clicks: number;
  engagement: number;
  revenue: number;
  aiConfidence: number;
  score: number;
  weights: RankingWeights;
  publishedAt: string | null;
  breakdown: {
    ctrComponent: number;
    engagementComponent: number;
    revenueComponent: number;
    freshnessComponent: number;
  };
};

export class RankingService {
  freshnessMultiplier(publishedAt: Date | null, createdAt?: Date): number {
    const ref = publishedAt ?? createdAt ?? new Date();
    const hours = (Date.now() - ref.getTime()) / (1000 * 60 * 60);
    return Math.pow(0.5, hours / FRESHNESS_HALF_LIFE_HOURS);
  }

  computeScore(
    article: ArticleForRanking,
    weightsInput: RankingWeights,
  ): { score: number; breakdown: RankedArticleRow["breakdown"]; normalized: RankingWeights } {
    const w = normalizeWeights(weightsInput);
    const m = article.metrics;
    const ctr = m?.ctr ?? 0;
    const clicks = m?.clicks ?? 0;
    const engagement = m?.engagement ?? 0;
    const revenueProxy = clicks * 0.85;

    const normalizedCtr = Math.min(ctr / 40, 1) * 100;
    const normalizedEngagement = Math.min(engagement / 100, 1) * 100;
    const normalizedRevenue = Math.min(revenueProxy / 5000, 1) * 100;
    const freshnessComponent = this.freshnessMultiplier(article.publishedAt, article.createdAt) * 100;

    const ctrComponent = normalizedCtr * w.ctr;
    const engagementComponent = normalizedEngagement * w.engagement;
    const revenueComponent = normalizedRevenue * w.revenue;
    const freshnessPart = freshnessComponent * w.freshness;

    const score = Math.round((ctrComponent + engagementComponent + revenueComponent + freshnessPart) * 100) / 100;

    return {
      score,
      breakdown: {
        ctrComponent: Math.round(ctrComponent * 10) / 10,
        engagementComponent: Math.round(engagementComponent * 10) / 10,
        revenueComponent: Math.round(revenueComponent * 10) / 10,
        freshnessComponent: Math.round(freshnessPart * 10) / 10,
      },
      normalized: {
        ctr: Math.round(w.ctr * 100),
        engagement: Math.round(w.engagement * 100),
        freshness: Math.round(w.freshness * 100),
        revenue: Math.round(w.revenue * 100),
      },
    };
  }

  async listRanked(cityId?: number, weightsOverride?: RankingWeights): Promise<RankedArticleRow[]> {
    const weights = weightsOverride ?? (await getRankingWeights());

    const articles = await prisma.article.findMany({
      where: {
        cityId: cityId ?? undefined,
        status: { not: "rejected" },
      },
      include: {
        city: true,
        category: true,
        metrics: true,
        aiGenerations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      take: 100,
    });

    const ranked = articles.map((article) => {
      const { score, breakdown, normalized } = this.computeScore(article, weights);
      const clicks = article.metrics?.clicks ?? 0;
      return {
        id: article.id,
        title: article.title,
        city: article.city.name,
        cityId: article.city.id,
        category: article.category.name,
        ctr: article.metrics?.ctr ?? 0,
        clicks,
        engagement: article.metrics?.engagement ?? 0,
        revenue: Math.round(clicks * 0.85),
        aiConfidence: article.aiGenerations[0]?.confidenceScore ?? 0,
        score,
        weights: normalized,
        publishedAt: article.publishedAt?.toISOString() ?? null,
        breakdown,
      };
    });

    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }

  async recalculateCity(cityId: number, weightsOverride?: RankingWeights) {
    const weights = weightsOverride ?? (await getRankingWeights());
    const w = normalizeWeights(weights);

    const articles = await prisma.article.findMany({
      where: { cityId, status: { not: "rejected" } },
      include: {
        city: true,
        category: true,
        metrics: true,
        aiGenerations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const scored = articles.map((article) => {
      const { score } = this.computeScore(article, weights);
      return { article, score };
    });

    scored.sort((a, b) => b.score - a.score);

    for (const item of scored) {
      await prisma.rankingScore.upsert({
        where: { articleId: item.article.id },
        create: {
          articleId: item.article.id,
          score: item.score,
          ctrWeight: w.ctr * 100,
          revenueWeight: w.revenue * 100,
          engagementWeight: w.engagement * 100,
          updatedAt: new Date(),
        },
        update: {
          score: item.score,
          ctrWeight: w.ctr * 100,
          revenueWeight: w.revenue * 100,
          engagementWeight: w.engagement * 100,
          updatedAt: new Date(),
        },
      });
    }

    const manualSlots = await prisma.homepageSlot.findMany({
      where: { cityId, manualOverride: true, active: true },
    });
    const manualArticleIds = new Set(manualSlots.map((s) => s.articleId));

    const autoCandidates = scored.filter((s) => !manualArticleIds.has(s.article.id));
    let position = 1;
    const slots: { cityId: number; articleId: number; position: number; manualOverride: boolean }[] =
      [];

    for (const slot of manualSlots.sort((a, b) => a.position - b.position)) {
      if (position > TOP_SLOTS) break;
      slots.push({
        cityId,
        articleId: slot.articleId,
        position,
        manualOverride: true,
      });
      position += 1;
    }

    for (const candidate of autoCandidates) {
      if (position > TOP_SLOTS) break;
      if (slots.some((s) => s.articleId === candidate.article.id)) continue;
      slots.push({
        cityId,
        articleId: candidate.article.id,
        position,
        manualOverride: false,
      });
      position += 1;
    }

    await prisma.homepageSlot.deleteMany({
      where: { cityId, manualOverride: false },
    });

    for (const slot of slots.filter((s) => !s.manualOverride)) {
      await prisma.homepageSlot.upsert({
        where: { cityId_position: { cityId, position: slot.position } },
        create: {
          cityId: slot.cityId,
          articleId: slot.articleId,
          position: slot.position,
          manualOverride: false,
          active: true,
          updatedAt: new Date(),
        },
        update: {
          articleId: slot.articleId,
          active: true,
          updatedAt: new Date(),
        },
      });

      await prisma.articleMetric.upsert({
        where: { articleId: slot.articleId },
        create: {
          articleId: slot.articleId,
          views: 0,
          clicks: 0,
          ctr: 0,
          engagement: 0,
          homepageFeatured: true,
          updatedAt: new Date(),
        },
        update: { homepageFeatured: true, updatedAt: new Date() },
      });
    }

    await cacheDel(`rankings:city:${cityId}`);
    return { slots, weights: w, ranked: scored.length };
  }

  async recalculateAll(weightsOverride?: RankingWeights) {
    const cities = await prisma.city.findMany({ where: { status: "active" } });
    const results = [];
    for (const city of cities) {
      results.push(await this.recalculateCity(city.id, weightsOverride));
    }
    return results;
  }

  async getHomepage(cityId: number) {
    const cacheKey = `rankings:city:${cityId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);

    const slots = await prisma.homepageSlot.findMany({
      where: { cityId, active: true },
      orderBy: { position: "asc" },
      take: TOP_SLOTS,
      include: {
        article: {
          include: {
            category: true,
            metrics: true,
            rankingScore: true,
            content: { select: { seoDescription: true } },
            aiGenerations: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    await cacheSet(cacheKey, JSON.stringify(slots), 300);
    return slots;
  }

  async setManualOverride(cityId: number, articleId: number, position: number) {
    if (position < 1 || position > TOP_SLOTS) {
      throw new Error("Position must be between 1 and 10");
    }
    return prisma.homepageSlot.upsert({
      where: { cityId_position: { cityId, position } },
      create: {
        cityId,
        articleId,
        position,
        manualOverride: true,
        active: true,
        updatedAt: new Date(),
      },
      update: {
        articleId,
        manualOverride: true,
        active: true,
        updatedAt: new Date(),
      },
    });
  }

}

export const rankingService = new RankingService();
