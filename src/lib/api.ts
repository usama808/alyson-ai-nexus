const API_BASE = import.meta.env.VITE_API_URL ?? "";

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
  code?: string;
};

let accessToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem("alyson_token") : null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof localStorage !== "undefined") {
    if (token) localStorage.setItem("alyson_token", token);
    else localStorage.removeItem("alyson_token");
  }
}

export function isApiEnabled(): boolean {
  return Boolean(API_BASE);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new Error(json.error ?? "API request failed");
  }
  return json.data;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function hasAccessToken(): boolean {
  return Boolean(accessToken);
}

export async function apiLogin(email: string, password: string) {
  const result = await apiFetch<{
    accessToken: string;
    refreshToken: string;
    user: { id: number; name: string; email: string; role: string };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(result.accessToken);
  return result;
}

export type AiGenerationType =
  | "summary"
  | "rewrite"
  | "headline"
  | "seo"
  | "newsletter"
  | "social_caption";

export type ArticleDetail = {
  id: number;
  title: string;
  slug: string;
  city: string;
  category: string;
  source: string;
  sourceUrl?: string | null;
  status: string;
  ctr: number;
  clicks: number;
  revenue: number;
  engagement: number;
  aiConfidence: number;
  publishedAt: string;
  content?: string;
  seoDescription?: string;
  newsletterHtml?: string;
};

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

export async function fetchArticle(id: number) {
  return apiFetch<ArticleDetail>(`/articles/${id}`);
}

export type AiStatus = {
  mock: boolean;
  primaryProvider: string | null;
  configuredProviders: string[];
  models: Record<string, string>;
  ingestionAiEnabled: boolean;
};

export async function fetchAiStatus() {
  return apiFetch<AiStatus>("/ai/status");
}

export async function testAiConnection() {
  return apiFetch<{ ok: boolean; provider: string; model: string; sample?: string }>("/ai/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function generateArticleAi(
  articleId: number,
  body: {
    generationType: AiGenerationType;
    prompt: string;
    sourceText?: string;
  },
) {
  return apiFetch<AiGenerateResult>(`/articles/${articleId}/ai/generate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
