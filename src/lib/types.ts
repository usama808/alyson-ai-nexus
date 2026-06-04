/** Article shape returned by GET /api/v1/feed/articles */
export type LiveArticle = {
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
  badges?: string[];
  /** Present on GET /feed/articles/:id */
  content?: string;
  seoDescription?: string;
  newsletterHtml?: string;
};

export type LiveCity = {
  id: number;
  name: string;
  state: string;
  slug: string;
  subdomain: string;
  population: number;
  status: string;
  articles: number;
  clicks: number;
  ctr: number;
  revenue: number;
  subscribers: number;
  topCategory: string;
};
