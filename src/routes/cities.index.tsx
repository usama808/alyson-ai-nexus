import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, ArrowDown, ArrowUp } from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { AddCityDialog } from "@/components/AddCityDialog";
import { cities as mockCities } from "@/lib/mock-data";
import { useLiveCities } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";
import type { LiveCity } from "@/lib/types";
import { formatStateName } from "@/lib/us-states";

export const Route = createFileRoute("/cities/")({
  component: CitiesPage,
});

export type CitySortField = "name" | "articles" | "clicks" | "ctr" | "revenue" | "subscribers";

const SORT_OPTIONS: { value: CitySortField; label: string }[] = [
  { value: "articles", label: "Articles" },
  { value: "clicks", label: "Clicks" },
  { value: "revenue", label: "Revenue" },
  { value: "subscribers", label: "Subscribers" },
  { value: "ctr", label: "CTR" },
  { value: "name", label: "City name" },
];

function sortCities(list: LiveCity[], sort: CitySortField, order: "asc" | "desc"): LiveCity[] {
  const dir = order === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    if (sort === "name") {
      return a.name.localeCompare(b.name) * dir;
    }
    return (a[sort] - b[sort]) * dir;
  });
}

function CitiesPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<CitySortField>("articles");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [addOpen, setAddOpen] = useState(false);
  const [addedCities, setAddedCities] = useState<LiveCity[]>([]);
  const live = isLiveApiEnabled();
  const { data: cityRes } = useLiveCities();

  const cities = live
    ? (cityRes?.cities ?? [])
    : [...mockCities, ...addedCities];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = cities.filter((c) => {
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.state.toLowerCase().includes(needle) ||
        formatStateName(c.state).toLowerCase().includes(needle) ||
        c.subdomain.toLowerCase().includes(needle)
      );
    });
    return sortCities(list, sort, sortOrder);
  }, [cities, q, sort, sortOrder]);

  const thClass = (field: CitySortField) =>
    `font-medium py-2 px-3 ${field === sort ? "text-primary" : ""} ${
      ["articles", "clicks", "ctr", "revenue", "subscribers"].includes(field) ? "text-right" : "text-left"
    }`;

  return (
    <PageShell title="Cities" subtitle={`${cities.length} city networks · sorted by ${SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}`}>
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cities..."
              className="h-9 w-full pl-8 pr-3 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CitySortField)}
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
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="h-9 px-3 text-sm rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 font-medium hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add city
            </button>
          </div>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className={`text-left py-2 px-5 ${sort === "name" ? "text-primary" : ""}`}>City</th>
                <th className="text-left font-medium py-2 px-3">Subdomain</th>
                <th className={thClass("articles")}>
                  Articles {sort === "articles" && (sortOrder === "desc" ? "↓" : "↑")}
                </th>
                <th className={thClass("clicks")}>
                  Clicks {sort === "clicks" && (sortOrder === "desc" ? "↓" : "↑")}
                </th>
                <th className={thClass("ctr")}>
                  CTR {sort === "ctr" && (sortOrder === "desc" ? "↓" : "↑")}
                </th>
                <th className={thClass("revenue")}>
                  Revenue {sort === "revenue" && (sortOrder === "desc" ? "↓" : "↑")}
                </th>
                <th className={thClass("subscribers")}>
                  Subscribers {sort === "subscribers" && (sortOrder === "desc" ? "↓" : "↑")}
                </th>
                <th className="text-left font-medium py-2 px-3">Top Category</th>
                <th className="text-left font-medium py-2 px-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition">
                  <td className="py-2.5 px-5">
                    <Link
                      to="/cities/$cityId"
                      params={{ cityId: String(c.id) }}
                      className="font-medium hover:text-primary"
                    >
                      {c.name}{" "}
                      <span className="text-muted-foreground font-normal">{formatStateName(c.state)}</span>
                    </Link>
                  </td>
                  <td className="px-3 text-muted-foreground tabular-nums">{c.subdomain}</td>
                  <td
                    className={`text-right tabular-nums px-3 ${sort === "articles" ? "font-semibold text-primary" : ""}`}
                  >
                    {c.articles.toLocaleString()}
                  </td>
                  <td
                    className={`text-right tabular-nums px-3 ${sort === "clicks" ? "font-semibold text-primary" : ""}`}
                  >
                    {c.clicks.toLocaleString()}
                  </td>
                  <td
                    className={`text-right tabular-nums px-3 ${sort === "ctr" ? "font-semibold text-primary" : ""}`}
                  >
                    {c.ctr}%
                  </td>
                  <td
                    className={`text-right tabular-nums px-3 ${sort === "revenue" ? "font-semibold text-primary" : ""}`}
                  >
                    ${(c.revenue / 1000).toFixed(1)}k
                  </td>
                  <td
                    className={`text-right tabular-nums px-3 ${sort === "subscribers" ? "font-semibold text-primary" : ""}`}
                  >
                    {c.subscribers.toLocaleString()}
                  </td>
                  <td className="px-3 text-muted-foreground">{c.topCategory}</td>
                  <td className="px-5">
                    <Badge tone={c.status === "active" ? "success" : "neutral"}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <AddCityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(city) => {
          if (!live) setAddedCities((prev) => [...prev, city]);
        }}
      />
    </PageShell>
  );
}
