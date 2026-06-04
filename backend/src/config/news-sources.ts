/** Platforms that run on every city scrape (see scraping.service runCityScrape). */
export const CONNECTED_NEWS_SOURCES = [
  {
    name: "Google News",
    method: "Per-city RSS search",
  },
  {
    name: "Reddit",
    method: "Public subreddit API",
  },
  {
    name: "BBC",
    method: "Global RSS feed",
  },
] as const;

/** Shown in UI but not wired to live scrapers yet. */
export const PLANNED_NEWS_SOURCES = [
  { name: "TikTok", method: "TikTok API key required" },
  { name: "Instagram", method: "Meta API credentials required" },
  { name: "Facebook", method: "Meta API credentials required" },
  { name: "Reuters", method: "Reuters wire / RSS not configured" },
] as const;

export const NEWS_SOURCE_CATALOG = [...CONNECTED_NEWS_SOURCES, ...PLANNED_NEWS_SOURCES];

export type SourceConnection = "connected" | "not_configured";

export type SourceDisplayStatus = "healthy" | "degraded" | "not_configured";

/** Detect seed/placeholder rows that are not real ingested content. */
export const PLACEHOLDER_POST_PATTERN = /placeholder|configure API credentials/i;

export function getSourceConnection(name: string): SourceConnection {
  return CONNECTED_NEWS_SOURCES.some((s) => s.name === name) ? "connected" : "not_configured";
}
