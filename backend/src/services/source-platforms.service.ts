import { prisma } from "../config/database.js";
import {
  CONNECTED_NEWS_SOURCES,
  getSourceConnection,
  NEWS_SOURCE_CATALOG,
  PLACEHOLDER_POST_PATTERN,
  PLANNED_NEWS_SOURCES,
  type SourceConnection,
  type SourceDisplayStatus,
} from "../config/news-sources.js";

const STALE_MS = 48 * 60 * 60 * 1000;

export type SourcePlatformRow = {
  name: string;
  connection: SourceConnection;
  status: SourceDisplayStatus;
  method: string;
  /** Posts ingested on last successful scrape window (connected only). */
  jobs: number;
  /** Legacy / placeholder rows still in DB (not actively ingested). */
  legacyPostsInDb: number;
  lastSync: string | null;
};

async function countRealPosts(platform: string, cityId?: number) {
  const posts = await prisma.socialPostRaw.findMany({
    where: { platform, cityId: cityId ?? undefined },
    select: { postText: true, scrapedAt: true },
    orderBy: { scrapedAt: "desc" },
    take: 500,
  });

  const real = posts.filter((p) => !PLACEHOLDER_POST_PATTERN.test(p.postText));
  const legacy = posts.length - real.length;
  const lastSync = real[0]?.scrapedAt?.toISOString() ?? null;

  return { realCount: real.length, legacyCount: legacy, lastSync };
}

async function countRecentRealPosts(platform: string, cityId?: number) {
  const since = new Date(Date.now() - STALE_MS);
  const posts = await prisma.socialPostRaw.findMany({
    where: {
      platform,
      cityId: cityId ?? undefined,
      scrapedAt: { gte: since },
    },
    select: { postText: true },
  });
  return posts.filter((p) => !PLACEHOLDER_POST_PATTERN.test(p.postText)).length;
}

export async function buildSourcePlatformRows(cityId?: number): Promise<SourcePlatformRow[]> {
  const rows: SourcePlatformRow[] = [];

  for (const source of CONNECTED_NEWS_SOURCES) {
    const { realCount, legacyCount, lastSync } = await countRealPosts(source.name, cityId);
    const recent = await countRecentRealPosts(source.name, cityId);

    let status: SourceDisplayStatus = "degraded";
    if (recent > 0) status = "healthy";
    else if (realCount > 0 && lastSync) {
      const age = Date.now() - new Date(lastSync).getTime();
      status = age <= STALE_MS ? "healthy" : "degraded";
    } else if (realCount === 0) {
      status = "degraded";
    }

    rows.push({
      name: source.name,
      connection: "connected",
      status,
      method: source.method,
      jobs: recent > 0 ? recent : realCount,
      legacyPostsInDb: legacyCount,
      lastSync,
    });
  }

  for (const source of PLANNED_NEWS_SOURCES) {
    const { realCount, legacyCount, lastSync } = await countRealPosts(source.name, cityId);
    rows.push({
      name: source.name,
      connection: "not_configured",
      status: "not_configured",
      method: source.method,
      jobs: 0,
      legacyPostsInDb: realCount + legacyCount,
      lastSync: legacyCount > 0 ? lastSync : null,
    });
  }

  return rows;
}

export function listSourceCatalog() {
  return NEWS_SOURCE_CATALOG.map((s) => ({
    name: s.name,
    method: s.method,
    connection: getSourceConnection(s.name),
  }));
}

export const sourcePlatformsService = { buildSourcePlatformRows, listSourceCatalog };
