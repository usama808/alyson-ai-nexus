import { settingsService } from "./settings.service.js";

export type RankingWeights = {
  ctr: number;
  engagement: number;
  freshness: number;
  revenue: number;
};

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  ctr: 40,
  engagement: 30,
  freshness: 20,
  revenue: 10,
};

const KEYS = {
  ctr: "ranking.ctr_weight",
  engagement: "ranking.engagement_weight",
  freshness: "ranking.freshness_weight",
  revenue: "ranking.revenue_weight",
  autoRank: "ranking.auto_enabled",
} as const;

async function readWeight(key: string, fallback: number): Promise<number> {
  const v = await settingsService.get(key);
  return typeof v === "number" ? v : fallback;
}

export async function getRankingWeights(): Promise<RankingWeights> {
  return {
    ctr: await readWeight(KEYS.ctr, DEFAULT_RANKING_WEIGHTS.ctr),
    engagement: await readWeight(KEYS.engagement, DEFAULT_RANKING_WEIGHTS.engagement),
    freshness: await readWeight(KEYS.freshness, DEFAULT_RANKING_WEIGHTS.freshness),
    revenue: await readWeight(KEYS.revenue, DEFAULT_RANKING_WEIGHTS.revenue),
  };
}

export async function setRankingWeights(weights: RankingWeights): Promise<RankingWeights> {
  const normalized = normalizeWeightsTo100(weights);
  await Promise.all([
    settingsService.set(KEYS.ctr, normalized.ctr, "CTR weight %"),
    settingsService.set(KEYS.engagement, normalized.engagement, "Engagement weight %"),
    settingsService.set(KEYS.freshness, normalized.freshness, "Freshness weight %"),
    settingsService.set(KEYS.revenue, normalized.revenue, "Revenue weight %"),
  ]);
  return normalized;
}

export async function isAutoRankEnabled(): Promise<boolean> {
  const v = await settingsService.get(KEYS.autoRank);
  return v !== false && v !== "false";
}

export async function setAutoRankEnabled(enabled: boolean): Promise<void> {
  await settingsService.set(KEYS.autoRank, enabled, "Auto-rank homepage on interval");
}

export function normalizeWeights(weights: RankingWeights): RankingWeights {
  const sum = weights.ctr + weights.engagement + weights.freshness + weights.revenue;
  if (sum <= 0) return { ctr: 0.25, engagement: 0.25, freshness: 0.25, revenue: 0.25 };
  return {
    ctr: weights.ctr / sum,
    engagement: weights.engagement / sum,
    freshness: weights.freshness / sum,
    revenue: weights.revenue / sum,
  };
}

function normalizeWeightsTo100(weights: RankingWeights): RankingWeights {
  const keys: (keyof RankingWeights)[] = ["ctr", "engagement", "freshness", "revenue"];
  const rawSum = keys.reduce((s, k) => s + Math.max(0, weights[k]), 0);
  if (rawSum <= 0) return { ctr: 25, engagement: 25, freshness: 25, revenue: 25 };

  const scaled = keys.map((k) => {
    const raw = (Math.max(0, weights[k]) / rawSum) * 100;
    const floor = Math.floor(raw);
    return { k, raw, floor, frac: raw - floor };
  });

  let remainder = 100 - scaled.reduce((s, x) => s + x.floor, 0);
  scaled.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < scaled.length && remainder > 0; i++) {
    scaled[i].floor += 1;
    remainder -= 1;
  }

  const out = { ctr: 0, engagement: 0, freshness: 0, revenue: 0 };
  for (const row of scaled) out[row.k] = row.floor;
  return out;
}
