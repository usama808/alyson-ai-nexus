export type TrafficRange = "7d" | "30d" | "90d";

export type TrafficPoint = {
  day: string;
  clicks: number;
  revenue: number;
  articles: number;
};

/** Deterministic network traffic series (no per-render randomness). */
export function buildTrafficSeries(range: TrafficRange): TrafficPoint[] {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return Array.from({ length: days }, (_, i) => ({
    day: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
    clicks: Math.round(28000 + Math.sin(i / 3) * 6000 + i * (range === "90d" ? 80 : 400)),
    revenue: Math.round(7500 + Math.sin(i / 4) * 1500 + i * (range === "90d" ? 25 : 100)),
    articles: Math.round(75 + Math.cos(i / 5) * 18 + (i % 7)),
  }));
}

export function trafficRangeLabel(range: TrafficRange): string {
  return { "7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days" }[range];
}
