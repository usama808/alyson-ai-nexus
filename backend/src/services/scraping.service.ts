import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { articleIngestionService } from "./article-ingestion.service.js";

const rssParser = new Parser({ timeout: 15000 });

const REDDIT_SUBREDDITS: Record<string, string[]> = {
  "new-york": ["nyc", "newyorkcity"],
  "los-angeles": ["LosAngeles", "California"],
  chicago: ["chicago"],
  miami: ["Miami"],
  dallas: ["Dallas"],
  houston: ["houston"],
  phoenix: ["phoenix"],
  philadelphia: ["philadelphia"],
  austin: ["Austin"],
  seattle: ["Seattle"],
};

const RSS_FEEDS = [
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", platform: "BBC" },
];

function googleNewsRssUrl(cityName: string, state: string): string {
  const q = encodeURIComponent(`${cityName} ${state} local news`);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

export class ScrapingService {
  async scrapeRedditForCity(cityId: number, citySlug: string) {
    const subreddits = REDDIT_SUBREDDITS[citySlug] ?? ["news"];
    const results = [];

    for (const sub of subreddits) {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=10`;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "AlysonAI/1.0 (local-news-bot)" },
        });
        if (!res.ok) continue;
        const json = (await res.json()) as {
          data?: {
            children?: {
              data?: {
                title?: string;
                selftext?: string;
                url?: string;
                score?: number;
                num_comments?: number;
              };
            }[];
          };
        };

        for (const child of json.data?.children ?? []) {
          const post = child.data;
          if (!post?.title) continue;
          const postUrl = post.url ?? `https://reddit.com/r/${sub}`;
          const duplicate = await prisma.socialPostRaw.findFirst({
            where: { cityId, postUrl },
          });
          if (duplicate) continue;

          const record = await prisma.socialPostRaw.create({
            data: {
              platform: "Reddit",
              cityId,
              postText: `${post.title}\n\n${post.selftext ?? ""}`.trim(),
              likes: post.score ?? 0,
              comments: post.num_comments ?? 0,
              shares: 0,
              postUrl,
              scrapedAt: new Date(),
            },
          });
          results.push(record);
        }
      } catch (err) {
        logger.warn({ sub, err }, "Reddit scrape failed");
      }
    }

    return results;
  }

  async scrapeRssFeeds(cityId: number, cityName?: string, state?: string) {
    const results = [];
    const feeds = [...RSS_FEEDS];

    if (cityName && state) {
      feeds.unshift({
        name: "Google News",
        url: googleNewsRssUrl(cityName, state),
        platform: "Google News",
      });
    }

    for (const feed of feeds) {
      try {
        const parsed = await rssParser.parseURL(feed.url);
        for (const item of (parsed.items ?? []).slice(0, 8)) {
          const postUrl = item.link ?? item.guid ?? feed.url;
          const duplicate = await prisma.socialPostRaw.findFirst({
            where: { cityId, postUrl },
          });
          if (duplicate) continue;

          const record = await prisma.socialPostRaw.create({
            data: {
              platform: feed.platform,
              cityId,
              postText: `${item.title ?? ""}\n${item.contentSnippet ?? item.summary ?? ""}`.trim(),
              likes: 0,
              comments: 0,
              shares: 0,
              postUrl,
              scrapedAt: new Date(),
            },
          });
          results.push(record);
        }
      } catch (err) {
        logger.warn({ feed: feed.name, err }, "RSS scrape failed");
      }
    }
    return results;
  }

  async scrapeUrl(url: string, platform: string) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlysonAI/1.0)" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim();
    const text = $("article p, main p, .story-body p")
      .map((_, el) => $(el).text())
      .get()
      .join("\n")
      .trim();

    return { platform, title, text: text || title, url };
  }

  async scrapePlaceholder(platform: "TikTok" | "Instagram" | "Facebook", cityId: number) {
    logger.info({ platform, cityId }, "Placeholder scrape — store metadata only");
    return prisma.socialPostRaw.create({
      data: {
        platform,
        cityId,
        postText: `[${platform}] Trending content placeholder — configure API credentials`,
        likes: 0,
        comments: 0,
        shares: 0,
        postUrl: `https://${platform.toLowerCase()}.com/trending`,
        scrapedAt: new Date(),
      },
    });
  }

  async runCityScrape(cityId: number) {
    const city = await prisma.city.findUniqueOrThrow({ where: { id: cityId } });
    const todayCount = await prisma.article.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });

    if (todayCount >= env.DAILY_ARTICLE_CAP) {
      logger.warn("Daily article cap reached");
      return { skipped: true, reason: "daily_cap" };
    }

    const reddit = await this.scrapeRedditForCity(city.id, city.slug);
    const rss = await this.scrapeRssFeeds(city.id, city.name, city.state);
    const ingestion = await articleIngestionService.ingestFromRawPosts(city.id, 10);

    return {
      reddit: reddit.length,
      rss: rss.length,
      articlesCreated: ingestion.created,
    };
  }

  async refreshAllCities() {
    const cities = await prisma.city.findMany({ where: { status: "active" } });
    const results = [];
    for (const city of cities) {
      try {
        results.push({ city: city.name, ...(await this.runCityScrape(city.id)) });
      } catch (err) {
        logger.warn({ cityId: city.id, err }, "City refresh failed");
        results.push({ city: city.name, error: true });
      }
    }
    return results;
  }

  async listRawPosts(cityId?: number, platform?: string, skip = 0, take = 20) {
    const where = {
      cityId: cityId ?? undefined,
      platform: platform ?? undefined,
    };
    const [items, total] = await Promise.all([
      prisma.socialPostRaw.findMany({
        where,
        orderBy: { scrapedAt: "desc" },
        skip,
        take,
        include: { city: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.socialPostRaw.count({ where }),
    ]);
    return { items, total };
  }
}

export const scrapingService = new ScrapingService();
