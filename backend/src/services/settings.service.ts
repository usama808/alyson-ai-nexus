import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";

const DEFAULT_SETTINGS: Record<string, { value: unknown; description: string }> = {
  "moderation.mode": {
    value: env.MODERATION_MODE,
    description: "When true, all articles require human approval",
  },
  "ai.auto_publish_threshold": {
    value: env.AUTO_PUBLISH_THRESHOLD,
    description: "Auto-publish when confidence >= threshold",
  },
  "ai.review_threshold": {
    value: env.REVIEW_THRESHOLD,
    description: "Send to review queue when confidence is between review and auto-publish",
  },
  "ranking.auto_interval_min": {
    value: env.AUTO_RANK_INTERVAL_MIN,
    description: "Ranking recalculation interval in minutes",
  },
  "ranking.ctr_weight": { value: 40, description: "CTR ranking weight %" },
  "ranking.engagement_weight": { value: 30, description: "Engagement ranking weight %" },
  "ranking.freshness_weight": { value: 20, description: "Freshness ranking weight %" },
  "ranking.revenue_weight": { value: 35, description: "Revenue ranking weight %" },
  "ranking.auto_enabled": { value: true, description: "Auto-rank on schedule" },
  "scraping.reddit_interval_sec": {
    value: env.SCRAPING_REDDIT_INTERVAL_SEC,
    description: "Reddit poll interval",
  },
  "scraping.tiktok_interval_sec": {
    value: env.SCRAPING_TIKTOK_INTERVAL_SEC,
    description: "TikTok poll interval",
  },
  "scraping.daily_article_cap": {
    value: env.DAILY_ARTICLE_CAP,
    description: "Max articles created per day network-wide",
  },
  "seo.default_og_image": {
    value: "alyson-share.png",
    description: "Default OG image",
  },
  "seo.sitemap_refresh": {
    value: "hourly",
    description: "Sitemap refresh cadence",
  },
  "city.subdomain_pattern": {
    value: "{slug}.alyson.news",
    description: "Subdomain pattern for new cities",
  },
};

export class SettingsService {
  async get(key: string): Promise<unknown> {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row) return row.value;
    return DEFAULT_SETTINGS[key]?.value ?? null;
  }

  async getBool(key: string): Promise<boolean> {
    const v = await this.get(key);
    return v === true || v === "true";
  }

  async getNumber(key: string): Promise<number> {
    const v = await this.get(key);
    return typeof v === "number" ? v : Number(v);
  }

  async set(key: string, value: unknown, description?: string) {
    return prisma.setting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, description },
      update: { value: value as Prisma.InputJsonValue, description },
    });
  }

  async getAll() {
    const rows = await prisma.setting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (!map.has(key)) map.set(key, def.value as Prisma.JsonValue);
    }
    return Object.fromEntries(map);
  }

  async isModerationEnabled(): Promise<boolean> {
    return this.getBool("moderation.mode");
  }

  async getAutoPublishThreshold(): Promise<number> {
    return this.getNumber("ai.auto_publish_threshold");
  }

  async getReviewThreshold(): Promise<number> {
    return this.getNumber("ai.review_threshold");
  }
}

export const settingsService = new SettingsService();
