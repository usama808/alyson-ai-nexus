import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, Download, FileSpreadsheet, FileText, Filter, RotateCcw, Tag } from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cities as mockCities } from "@/lib/mock-data";
import {
  buildCitySubscriberRows,
  buildGrowthSeries,
  filterCityRows,
  filterLabel,
  QUICK_FILTERS,
  totalForFilter,
  countForRow,
  type SubscriberFilter,
} from "@/lib/subscribers-data";
import { downloadSubscribersCsv, printSubscribersReport } from "@/lib/subscribers-export";
import { useLiveCities } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscribers")({
  component: SubscribersPage,
});

function SubscribersPage() {
  const [filter, setFilter] = useState<SubscriberFilter>("all");
  const live = isLiveApiEnabled();
  const { data: cityRes } = useLiveCities();

  const pool = useMemo(() => {
    if (live && cityRes?.cities?.length) {
      return cityRes.cities.map((c) => ({
        id: c.id,
        name: c.name,
        subscribers: c.subscribers ?? 0,
        topCategory: c.topCategory,
      }));
    }
    return mockCities.map((c) => ({
      id: c.id,
      name: c.name,
      subscribers: c.subscribers,
      topCategory: c.topCategory,
    }));
  }, [live, cityRes?.cities]);

  const allRows = useMemo(() => buildCitySubscriberRows(pool), [pool]);
  const filteredRows = useMemo(() => filterCityRows(allRows, filter), [allRows, filter]);
  const growthSeries = useMemo(() => buildGrowthSeries(filter, allRows), [filter, allRows]);

  const subtitle =
    filter === "all"
      ? "Audience CRM & segmentation · all subscribers"
      : `${filterLabel(filter)} · ${totalForFilter(allRows, filter).toLocaleString()} total`;

  const toggleFilter = (id: SubscriberFilter) => {
    setFilter((prev) => (prev === id ? "all" : id));
  };

  const countColumnLabel =
    filter === "vip"
      ? "VIP"
      : filter === "unsubscribed"
        ? "Unsubscribed"
        : filter === "active"
          ? "Active"
          : "Subscribers";

  return (
    <PageShell title="Subscribers" subtitle={subtitle}>
      <div
        id="subscribers-report"
        className="subscribers-report space-y-4"
      >
        <div className="subscribers-print-header hidden mb-4 border-b border-border pb-3">
          <h1 className="text-lg font-semibold">Alyson · Subscribers Report</h1>
          <p className="text-sm text-muted-foreground">
            {filterLabel(filter)} · {new Date().toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 no-print">
          {filter !== "all" && (
            <Button type="button" variant="outline" size="sm" onClick={() => setFilter("all")} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Clear filter
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Download report</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  downloadSubscribersCsv({
                    filter,
                    growth: growthSeries,
                    rows: filteredRows,
                  })
                }
              >
                <FileSpreadsheet className="h-4 w-4" />
                Stats as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => printSubscribersReport()}>
                <FileText className="h-4 w-4" />
                Page as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <SectionCard
            className="xl:col-span-2"
            title="Subscriber Growth"
            description={
              filter === "all"
                ? "Monthly network totals"
                : `Monthly totals · ${filterLabel(filter).toLowerCase()}`
            }
          >
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={growthSeries}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="subscribers"
                    stroke="var(--color-primary)"
                    fill="url(#sg)"
                    strokeWidth={2}
                    name={filter === "unsubscribed" ? "Unsubscribes (trend)" : "Subscribers"}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Quick Filters" description="Click to filter charts and city table">
            <div className="space-y-2 text-sm">
              {QUICK_FILTERS.map((qf) => {
                const active = filter === qf.id;
                const count = totalForFilter(allRows, qf.id);
                return (
                  <button
                    key={qf.id}
                    type="button"
                    onClick={() => toggleFilter(qf.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md border transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-muted/50",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {qf.icon === "vip" ? (
                        <Tag className="h-3.5 w-3.5" />
                      ) : (
                        <Filter
                          className={cn(
                            "h-3.5 w-3.5",
                            qf.icon === "unsubscribed" ? "text-warning" : "text-primary",
                          )}
                        />
                      )}
                      {qf.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="By City"
          description={
            filter === "all"
              ? `${filteredRows.length} cities`
              : `${filteredRows.length} cities · showing ${countColumnLabel.toLowerCase()} counts`
          }
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 px-5 text-left font-medium">City</th>
                  <th className="py-2 px-3 text-right font-medium">{countColumnLabel}</th>
                  <th className="py-2 px-3 text-right font-medium">Growth</th>
                  <th className="py-2 px-3 text-right font-medium">Unsubscribe %</th>
                  <th className="py-2 px-5 text-left font-medium">Tag</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No cities match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition"
                    >
                      <td className="py-2.5 px-5 font-medium">{c.name}</td>
                      <td className="px-3 text-right tabular-nums font-medium">
                        {(countForRow(c, filter) ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 text-right tabular-nums text-success">+{c.growth}%</td>
                      <td className="px-3 text-right tabular-nums text-muted-foreground">
                        {c.unsubscribePct}%
                      </td>
                      <td className="px-5">
                        <Badge tone={filter === "vip" ? "brand" : "primary"}>{c.tag}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
