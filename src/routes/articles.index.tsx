import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Plus, ExternalLink, ArrowDown, ArrowUp } from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { ArticleRowMenu } from "@/components/ArticleRowMenu";
import { articles as mockArticles } from "@/lib/mock-data";
import { useLiveArticles } from "@/hooks/use-live-feed";
import { isLiveApiEnabled, type ArticleSortField } from "@/lib/api-client";
import { RefreshFeedButton } from "@/components/RefreshFeedButton";
import { AiConfidenceCell, AiConfidenceHeader } from "@/components/AiConfidenceCell";
import type { LiveArticle } from "@/lib/types";
import type { Article } from "@/lib/mock-data";

export const Route = createFileRoute("/articles/")({
  component: ArticlesPage,
});

const statusTone = {
  Draft: "neutral",
  "Pending Review": "warning",
  Published: "success",
  Rejected: "destructive",
  Approved: "success",
} as const;

type ListArticle = LiveArticle | Article;

const SORT_OPTIONS: { value: ArticleSortField; label: string }[] = [
  { value: "createdAt", label: "Date added" },
  { value: "publishedAt", label: "Published date" },
  { value: "aiConfidence", label: "AI confidence" },
  { value: "ctr", label: "CTR" },
  { value: "revenue", label: "Revenue" },
  { value: "clicks", label: "Clicks" },
  { value: "engagement", label: "Engagement" },
  { value: "title", label: "Title" },
];

function sortArticles(list: ListArticle[], sort: ArticleSortField, order: "asc" | "desc"): ListArticle[] {
  const dir = order === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (sort) {
      case "title":
        return a.title.localeCompare(b.title) * dir;
      case "publishedAt":
      case "createdAt":
        return (a.publishedAt.localeCompare(b.publishedAt) || a.id - b.id) * dir;
      case "aiConfidence":
        return (a.aiConfidence - b.aiConfidence) * dir;
      case "ctr":
        return (a.ctr - b.ctr) * dir;
      case "revenue":
        return (a.revenue - b.revenue) * dir;
      case "clicks":
        return (a.clicks - b.clicks) * dir;
      case "engagement":
        return (a.engagement - b.engagement) * dir;
      default:
        return 0;
    }
  });
}

function SourceCell({ source, sourceUrl }: { source: string; sourceUrl?: string | null }) {
  if (!sourceUrl) {
    return <Badge>{source}</Badge>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge>{source}</Badge>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open original source"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function ArticlesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<ArticleSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const live = isLiveApiEnabled();

  const { data, isLoading, isError } = useLiveArticles({
    limit: 100,
    search: q || undefined,
    status: status !== "all" ? status : undefined,
    sortBy: sort,
    sortOrder,
  });

  const articles: ListArticle[] = live ? (data?.articles ?? []) : mockArticles;

  const toggleSort = (field: ArticleSortField) => {
    if (sort === field) {
      setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSort(field);
      setSortOrder(field === "title" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    const list = live
      ? articles
      : articles.filter((a) => {
          if (status !== "all" && a.status !== status) return false;
          if (q && !a.title.toLowerCase().includes(q.toLowerCase())) return false;
          return true;
        });
    return live ? list : sortArticles(list, sort, sortOrder);
  }, [articles, live, status, q, sort, sortOrder]);

  const thClass = (field: ArticleSortField, align: "left" | "right" = "right") =>
    `font-medium py-2 px-3 cursor-pointer hover:text-foreground ${align === "right" ? "text-right" : "text-left"} ${
      sort === field ? "text-primary" : ""
    }`;

  const sortIndicator = (field: ArticleSortField) =>
    sort === field ? (sortOrder === "desc" ? " ↓" : " ↑") : "";

  return (
    <PageShell
      title="Articles"
      subtitle={
        live
          ? `Live local news · sorted by ${SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}`
          : `AI newsroom CMS · sorted by ${SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}`
      }
      actions={live ? <RefreshFeedButton /> : undefined}
    >
      {live && isError && (
        <p className="mb-4 text-sm text-destructive">API unavailable — start backend on port 4000.</p>
      )}
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "Draft", "Pending Review", "Published", "Rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`h-8 px-3 text-xs rounded-md border transition ${status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ArticleSortField)}
              className="h-9 px-3 text-sm rounded-md border border-border bg-card"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
              className="h-9 px-3 text-sm rounded-md border border-border bg-card hover:bg-muted inline-flex items-center gap-1.5"
              title={sortOrder === "desc" ? "Highest first" : "Lowest first"}
            >
              {sortOrder === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
              {sortOrder === "desc" ? "High → low" : "Low → high"}
            </button>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search articles..."
                className="h-9 w-64 pl-8 pr-3 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <Link
              to="/articles/$articleId"
              params={{ articleId: "new" }}
              className="h-9 px-3 text-sm rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 font-medium hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> New article
            </Link>
          </div>
        </div>

        {isLoading && live && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading live articles…</p>
        )}

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pl-5 pr-3 text-left font-medium w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className={thClass("title", "left")} onClick={() => toggleSort("title")}>
                  Title{sortIndicator("title")}
                </th>
                <th className="py-2 px-3 text-left font-medium">Category</th>
                <th className="py-2 px-3 text-left font-medium">Source</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <AiConfidenceHeader
                  active={sort === "aiConfidence"}
                  sortOrder={sortOrder}
                  onSort={() => toggleSort("aiConfidence")}
                />
                <th className={thClass("ctr")} onClick={() => toggleSort("ctr")}>
                  CTR{sortIndicator("ctr")}
                </th>
                <th className={thClass("revenue")} onClick={() => toggleSort("revenue")}>
                  Revenue{sortIndicator("revenue")}
                </th>
                <th className={thClass("publishedAt", "left")} onClick={() => toggleSort("publishedAt")}>
                  Published{sortIndicator("publishedAt")}
                </th>
                <th className="py-2 pr-5 pl-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">
                    No articles match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition">
                    <td className="pl-5 pr-3 py-2.5">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-2.5 px-3 max-w-md">
                      <Link
                        to="/articles/$articleId"
                        params={{ articleId: String(a.id) }}
                        className="font-medium line-clamp-1 hover:text-primary"
                      >
                        {a.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{a.city}</span>
                        {a.sourceUrl && (
                          <a
                            href={a.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Original source
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 text-muted-foreground">{a.category}</td>
                    <td className="px-3">
                      <SourceCell source={a.source} sourceUrl={a.sourceUrl} />
                    </td>
                    <td className="px-3">
                      <Badge tone={statusTone[a.status as keyof typeof statusTone] ?? "neutral"}>{a.status}</Badge>
                    </td>
                    <AiConfidenceCell score={a.aiConfidence} />
                    <td
                      className={`px-3 text-right tabular-nums ${sort === "ctr" ? "font-semibold text-primary" : ""}`}
                    >
                      {a.ctr}%
                    </td>
                    <td
                      className={`px-3 text-right tabular-nums ${sort === "revenue" ? "font-semibold text-primary" : ""}`}
                    >
                      ${a.revenue.toLocaleString()}
                    </td>
                    <td
                      className={`px-3 text-muted-foreground tabular-nums ${sort === "publishedAt" ? "font-semibold text-primary" : ""}`}
                    >
                      {a.publishedAt}
                    </td>
                    <td className="pr-5 pl-3">
                      <ArticleRowMenu id={a.id} title={a.title} sourceUrl={a.sourceUrl} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageShell>
  );
}
