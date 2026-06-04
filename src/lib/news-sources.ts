/** Mirrors backend news-sources catalog for offline UI. */

export type SourceConnection = "connected" | "not_configured";
export type SourceDisplayStatus = "healthy" | "degraded" | "not_configured";

export type SourcePlatformRow = {
  name: string;
  connection: SourceConnection;
  status: SourceDisplayStatus;
  method: string;
  jobs: number;
  legacyPostsInDb: number;
  lastSync: string | null;
};

export const CONNECTED_SOURCE_NAMES = ["Google News", "Reddit", "BBC"] as const;

export const MOCK_SOURCE_PLATFORMS: SourcePlatformRow[] = [
  {
    name: "Google News",
    connection: "connected",
    status: "healthy",
    method: "Per-city RSS search",
    jobs: 280,
    legacyPostsInDb: 0,
    lastSync: new Date().toISOString(),
  },
  {
    name: "Reddit",
    connection: "connected",
    status: "healthy",
    method: "Public subreddit API",
    jobs: 120,
    legacyPostsInDb: 0,
    lastSync: new Date().toISOString(),
  },
  {
    name: "BBC",
    connection: "connected",
    status: "healthy",
    method: "Global RSS feed",
    jobs: 64,
    legacyPostsInDb: 0,
    lastSync: new Date().toISOString(),
  },
  {
    name: "TikTok",
    connection: "not_configured",
    status: "not_configured",
    method: "TikTok API key required",
    jobs: 0,
    legacyPostsInDb: 0,
    lastSync: null,
  },
  {
    name: "Instagram",
    connection: "not_configured",
    status: "not_configured",
    method: "Meta API credentials required",
    jobs: 0,
    legacyPostsInDb: 0,
    lastSync: null,
  },
  {
    name: "Facebook",
    connection: "not_configured",
    status: "not_configured",
    method: "Meta API credentials required",
    jobs: 0,
    legacyPostsInDb: 0,
    lastSync: null,
  },
  {
    name: "Reuters",
    connection: "not_configured",
    status: "not_configured",
    method: "Reuters wire / RSS not configured",
    jobs: 0,
    legacyPostsInDb: 0,
    lastSync: null,
  },
];

/** Chart-friendly slice: connected sources only. */
export function connectedSourcesForChart(platforms: SourcePlatformRow[]) {
  return platforms
    .filter((p) => p.connection === "connected")
    .map((p) => ({ name: p.name, jobs: p.jobs, status: p.status === "not_configured" ? "degraded" : p.status }));
}
