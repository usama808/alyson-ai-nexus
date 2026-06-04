import { cities as mockCities } from "@/lib/mock-data";
import { MOCK_SOURCE_PLATFORMS, connectedSourcesForChart } from "@/lib/news-sources";

const networkSources = connectedSourcesForChart(MOCK_SOURCE_PLATFORMS);

export type AnalyticsCity = {
  id: number;
  name: string;
  clicks: number;
  revenue: number;
  articles: number;
};

export type TrafficPoint = {
  day: string;
  clicks: number;
  revenue: number;
  articles: number;
};

export type SourcePoint = {
  name: string;
  jobs: number;
  status: "healthy" | "degraded";
};

const DAYS = 30;

function dayKeyFromIndex(i: number, totalDays: number): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (totalDays - 1));
  const d = new Date(start);
  d.setDate(start.getDate() + i);
  return d.toISOString().slice(0, 10);
}

/** Deterministic pseudo-random in [0, 1) from seed */
function hash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function cityScale(city: AnalyticsCity): number {
  const networkClicks = mockCities.reduce((s, c) => s + c.clicks, 0);
  return networkClicks > 0 ? city.clicks / networkClicks : 1 / mockCities.length;
}

/** Per-city daily traffic (deterministic, scales from city totals). */
export function buildCityTrafficSeries(city: AnalyticsCity): TrafficPoint[] {
  const scale = cityScale(city) * mockCities.length;
  const clickBase = city.clicks / DAYS;
  const revBase = city.revenue / DAYS;
  const artBase = city.articles / DAYS;

  return Array.from({ length: DAYS }, (_, i) => {
    const wave = Math.sin((i + city.id) / 3) * 0.12 + Math.cos((i + city.id) / 5) * 0.08;
    const jitter = (hash(city.id * 100 + i) - 0.5) * 0.1;
    const factor = 1 + wave + jitter;
    return {
      day: dayKeyFromIndex(i, DAYS),
      clicks: Math.max(0, Math.round(clickBase * factor)),
      revenue: Math.max(0, Math.round(revBase * factor)),
      articles: Math.max(0, Math.round(artBase * factor * (0.9 + hash(city.id * 50 + i) * 0.2))),
    };
  });
}

export function buildNetworkTrafficSeries(): TrafficPoint[] {
  return aggregateTrafficSeries(
    mockCities.map((c) => c.id),
    mockCities,
  );
}

export function aggregateTrafficSeries(cityIds: number[], pool: AnalyticsCity[]): TrafficPoint[] {
  if (cityIds.length === 0) {
    return buildNetworkTrafficSeries();
  }
  const selected = pool.filter((c) => cityIds.includes(c.id));
  if (selected.length === 0) return buildNetworkTrafficSeries();

  const seriesList = selected.map(buildCityTrafficSeries);
  return Array.from({ length: DAYS }, (_, i) => ({
    day: dayKeyFromIndex(i, DAYS),
    clicks: seriesList.reduce((s, row) => s + row[i].clicks, 0),
    revenue: seriesList.reduce((s, row) => s + row[i].revenue, 0),
    articles: seriesList.reduce((s, row) => s + row[i].articles, 0),
  }));
}

/** Per-city source mix (deterministic). */
export function buildCitySourcePlatforms(city: AnalyticsCity): SourcePoint[] {
  const totalJobs = Math.round(city.clicks / 180);
  const weights = networkSources.map((s, i) => {
    const w = 0.6 + hash(city.id * 17 + i * 3) * 0.8;
    return { ...s, weight: w };
  });
  const sumW = weights.reduce((s, x) => s + x.weight, 0);

  return weights.map((s) => ({
    name: s.name,
    status: s.status,
    jobs: Math.max(1, Math.round((s.weight / sumW) * totalJobs)),
  }));
}

export function aggregateSourcePlatforms(cityIds: number[], pool: AnalyticsCity[]): SourcePoint[] {
  if (cityIds.length === 0) {
    return networkSources.map((s) => ({ ...s }));
  }
  const selected = pool.filter((c) => cityIds.includes(c.id));
  const merged = new Map<string, SourcePoint>();

  for (const city of selected) {
    for (const row of buildCitySourcePlatforms(city)) {
      const prev = merged.get(row.name);
      if (prev) {
        merged.set(row.name, { ...prev, jobs: prev.jobs + row.jobs });
      } else {
        merged.set(row.name, { ...row });
      }
    }
  }

  return [...merged.values()].sort((a, b) => b.jobs - a.jobs);
}

export function formatSelectionLabel(names: string[]): string {
  if (names.length === 0) return "All cities · all time";
  if (names.length === 1) return names[0];
  if (names.length <= 3) return names.join(", ");
  return `${names.length} cities selected`;
}

export const defaultAnalyticsCities: AnalyticsCity[] = mockCities.map((c) => ({
  id: c.id,
  name: c.name,
  clicks: c.clicks,
  revenue: c.revenue,
  articles: c.articles,
}));
