import type { LiveArticle, LiveCity } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type ListMeta = { page: number; limit: number; total: number; totalPages: number };

async function feedFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T; meta?: ListMeta }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers as Record<string, string>) },
  });
  const json = (await res.json()) as {
    success: boolean;
    data: T;
    meta?: ListMeta;
    error?: string;
  };
  if (!json.success) throw new Error(json.error ?? "Request failed");
  return { data: json.data, meta: json.meta };
}

export function isLiveApiEnabled(): boolean {
  return Boolean(API_BASE);
}

export type ArticleSortField =
  | "createdAt"
  | "publishedAt"
  | "title"
  | "aiConfidence"
  | "ctr"
  | "clicks"
  | "revenue"
  | "engagement";

export async function fetchLiveArticles(params?: {
  cityId?: number;
  status?: string;
  search?: string;
  limit?: number;
  sortBy?: ArticleSortField;
  sortOrder?: "asc" | "desc";
}) {
  const q = new URLSearchParams();
  if (params?.cityId) q.set("cityId", String(params.cityId));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.sortBy) q.set("sortBy", params.sortBy);
  q.set("sortOrder", params?.sortOrder ?? "desc");
  const { data, meta } = await feedFetch<LiveArticle[]>(`/feed/articles?${q}`);
  return { articles: data, meta };
}

export async function fetchLiveArticle(id: number) {
  const { data } = await feedFetch<LiveArticle>(`/feed/articles/${id}`);
  return data;
}

export type AiGenerationType =
  | "summary"
  | "rewrite"
  | "headline"
  | "seo"
  | "newsletter"
  | "social_caption";

export type AiGenerateResult = {
  output: string;
  confidence: {
    score: number;
    factors: Record<string, number>;
  };
  generation: {
    id: number;
    model: string;
    provider: string;
    generationType: string;
    confidenceScore: number;
  };
};

export async function generateLiveArticleAi(
  articleId: number,
  body: {
    generationType: AiGenerationType;
    prompt: string;
    sourceText?: string;
  },
) {
  const { data } = await feedFetch<AiGenerateResult>(`/feed/articles/${articleId}/ai/generate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data;
}

export type CitySortField = "name" | "articles" | "clicks" | "ctr" | "revenue" | "subscribers";

export async function fetchLiveCities(params?: {
  sortBy?: CitySortField;
  sortOrder?: "asc" | "desc";
}) {
  const q = new URLSearchParams({ limit: "50" });
  if (params?.sortBy) q.set("sortBy", params.sortBy);
  if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
  const { data, meta } = await feedFetch<LiveCity[]>(`/feed/cities?${q}`);
  return { cities: data, meta };
}

export type CreateCityInput = {
  name: string;
  state: string;
  subdomain: string;
  population: number;
  status?: "active" | "paused";
};

export type AiStatus = {
  mock: boolean;
  primaryProvider: string | null;
  configuredProviders: string[];
  models: Record<string, string>;
  ingestionAiEnabled: boolean;
};

export async function fetchAiStatus() {
  const { data } = await feedFetch<AiStatus>("/feed/ai/status");
  return data;
}

export type PipelineStage = {
  name: string;
  active: number;
  queued: number;
  success: number;
};

export type PipelineSourcePlatform = {
  name: string;
  connection: "connected" | "not_configured";
  status: "healthy" | "degraded" | "not_configured";
  method: string;
  jobs: number;
  legacyPostsInDb: number;
  lastSync: string | null;
};

export type PipelineEvent = {
  id: number;
  message: string;
  status: "success" | "warning" | "error" | "info";
  at: string;
};

export type PipelineDashboard = {
  pipelineStages: PipelineStage[];
  sourcePlatforms: PipelineSourcePlatform[];
  recentEvents: PipelineEvent[];
  summary: { liveAi: boolean; lastScrapeAt: string | null };
};

export async function fetchLivePipeline() {
  const { data } = await feedFetch<PipelineDashboard>("/feed/pipeline");
  return data;
}

export async function createLiveCity(input: CreateCityInput) {
  const { data } = await feedFetch<LiveCity>("/feed/cities", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function refreshLiveFeed(cityId?: number) {
  const { data } = await feedFetch<unknown>("/feed/refresh", {
    method: "POST",
    body: JSON.stringify(cityId ? { cityId } : {}),
  });
  return data;
}

export type RankingWeights = {
  ctr: number;
  engagement: number;
  freshness: number;
  revenue: number;
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
  breakdown?: {
    ctrComponent: number;
    engagementComponent: number;
    revenueComponent: number;
    freshnessComponent: number;
  };
};

export async function fetchRankingWeights() {
  const { data } = await feedFetch<{ weights: RankingWeights; autoRank: boolean }>(
    "/feed/rankings/weights",
  );
  return data;
}

export async function saveRankingWeights(weights: RankingWeights, autoRank?: boolean) {
  const { data } = await feedFetch<{ weights: RankingWeights; autoRank: boolean }>(
    "/feed/rankings/weights",
    {
      method: "PUT",
      body: JSON.stringify({ ...weights, autoRank }),
    },
  );
  return data;
}

export async function fetchRankedArticles(cityId?: number, weights?: RankingWeights) {
  const q = new URLSearchParams();
  if (cityId) q.set("cityId", String(cityId));
  if (weights) q.set("weights", JSON.stringify(weights));
  const { data } = await feedFetch<RankedArticleRow[]>(`/feed/rankings?${q}`);
  return data;
}

export async function recalculateRankings(cityId?: number, weights?: RankingWeights) {
  const { data } = await feedFetch<{ ranked: RankedArticleRow[] }>("/feed/rankings/recalculate", {
    method: "POST",
    body: JSON.stringify({ cityId, weights }),
  });
  return data;
}
