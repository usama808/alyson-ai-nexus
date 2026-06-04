export const ARTICLE_STATUSES = [
  "draft",
  "review_pending",
  "approved",
  "published",
  "rejected",
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export function toFrontendStatus(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    review_pending: "Pending Review",
    approved: "Approved",
    published: "Published",
    rejected: "Rejected",
  };
  return map[status] ?? status;
}

export function fromFrontendStatus(status: string): ArticleStatus {
  const map: Record<string, ArticleStatus> = {
    Draft: "draft",
    "Pending Review": "review_pending",
    Approved: "approved",
    Published: "published",
    Rejected: "rejected",
    draft: "draft",
    review_pending: "review_pending",
    approved: "approved",
    published: "published",
    rejected: "rejected",
  };
  const normalized = map[status];
  if (!normalized) throw new Error(`Invalid article status: ${status}`);
  return normalized;
}
