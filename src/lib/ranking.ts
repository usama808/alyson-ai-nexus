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

export type RankedArticle = {
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
  breakdown?: {
    ctrComponent: number;
    engagementComponent: number;
    revenueComponent: number;
    freshnessComponent: number;
  };
};

export function normalizeWeights(weights: RankingWeights): RankingWeights {
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

/** Client-side preview when API is offline */
export function scoreArticleMock(
  article: { ctr: number; engagement: number; clicks: number; aiConfidence: number },
  weights: RankingWeights,
): number {
  const w = normalizeWeights(weights);
  const sum = w.ctr + w.engagement + w.freshness + w.revenue;
  const normalizedCtr = Math.min(article.ctr / 40, 1) * 100;
  const normalizedEngagement = Math.min(article.engagement / 100, 1) * 100;
  const normalizedRevenue = Math.min((article.clicks * 0.85) / 5000, 1) * 100;
  const freshness = 70;
  return Math.round(
    (normalizedCtr * (w.ctr / sum) +
      normalizedEngagement * (w.engagement / sum) +
      normalizedRevenue * (w.revenue / sum) +
      freshness * (w.freshness / sum)) *
      100,
  ) / 100;
}
