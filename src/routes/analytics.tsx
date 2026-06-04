import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RotateCcw, X } from "lucide-react";
import { PageShell, SectionCard } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  aggregateSourcePlatforms,
  aggregateTrafficSeries,
  defaultAnalyticsCities,
  formatSelectionLabel,
  type AnalyticsCity,
} from "@/lib/analytics-data";
import { useLiveCities } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function toggleCityId(prev: number[], id: number): number[] {
  return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
}

function AnalyticsPage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const live = isLiveApiEnabled();
  const { data: cityRes } = useLiveCities();

  const cityPool: AnalyticsCity[] = useMemo(() => {
    if (live && cityRes?.cities?.length) {
      return cityRes.cities.map((c) => ({
        id: c.id,
        name: c.name,
        clicks: c.clicks,
        revenue: c.revenue,
        articles: c.articles,
      }));
    }
    return defaultAnalyticsCities;
  }, [live, cityRes?.cities]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hasFilter = selectedIds.length > 0;

  const selectedNames = useMemo(
    () => cityPool.filter((c) => selectedSet.has(c.id)).map((c) => c.name),
    [cityPool, selectedSet],
  );

  const trafficSeries = useMemo(
    () => aggregateTrafficSeries(selectedIds, cityPool),
    [selectedIds, cityPool],
  );

  const categorySeries = useMemo(() => trafficSeries.slice(-14), [trafficSeries]);

  const sourcePlatforms = useMemo(
    () => aggregateSourcePlatforms(selectedIds, cityPool),
    [selectedIds, cityPool],
  );

  const cityBarData = useMemo(() => {
    const sorted = [...cityPool].sort((a, b) => b.clicks - a.clicks);
    const top = sorted.slice(0, 8);
    if (!hasFilter) return top;
    const extra = sorted.filter((c) => selectedSet.has(c.id) && !top.some((t) => t.id === c.id));
    return [...extra, ...top].slice(0, 12);
  }, [cityPool, hasFilter, selectedSet]);

  const onCityBarClick = useCallback((cityId: number) => {
    setSelectedIds((prev) => toggleCityId(prev, cityId));
  }, []);

  const resetFilters = useCallback(() => setSelectedIds([]), []);

  const subtitle = formatSelectionLabel(selectedNames);

  return (
    <PageShell
      title="Analytics"
      subtitle={subtitle}
      actions={
        hasFilter ? (
          <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to all cities
          </Button>
        ) : undefined
      }
    >
      {hasFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtering charts:</span>
          {selectedNames.map((name) => {
            const id = cityPool.find((c) => c.name === name)?.id;
            return (
              <button
                key={name}
                type="button"
                onClick={() => id != null && setSelectedIds((prev) => prev.filter((x) => x !== id))}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
              >
                {name}
                <X className="h-3 w-3" />
              </button>
            );
          })}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <p className="mb-4 text-xs text-muted-foreground">
        Click cities in the comparison chart to filter all panels. Hold selections to compare multiple cities.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          className="xl:col-span-2"
          title="Revenue & Clicks"
          description={hasFilter ? `Daily totals for ${subtitle}` : "Network-wide daily totals"}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={trafficSeries}>
                <defs>
                  <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
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
                <Area type="monotone" dataKey="clicks" stroke="var(--color-primary)" fill="url(#ag1)" strokeWidth={2} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" fill="url(#ag2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="City Comparison"
          description={
            hasFilter
              ? "Selected cities · click a bar to add or remove"
              : "Top cities by clicks · click to filter"
          }
        >
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={cityBarData} layout="vertical" margin={{ left: 4, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={84}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [value.toLocaleString(), "Clicks"]}
                />
                <Bar
                  dataKey="clicks"
                  radius={[0, 6, 6, 0]}
                  barSize={14}
                  cursor="pointer"
                  onClick={(bar) => {
                    const row = bar?.payload as AnalyticsCity | undefined;
                    if (row?.id != null) onCityBarClick(row.id);
                  }}
                >
                  {cityBarData.map((entry) => {
                    const selected = selectedSet.has(entry.id);
                    return (
                      <Cell
                        key={entry.id}
                        fill="var(--color-primary)"
                        fillOpacity={selected ? 1 : hasFilter ? 0.25 : 0.35 + (entry.id % 5) * 0.1}
                        stroke={selected ? "var(--color-primary)" : undefined}
                        strokeWidth={selected ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Category Trends"
          description={hasFilter ? "Articles & revenue (last 14 days)" : "Network articles & revenue (last 14 days)"}
        >
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={categorySeries}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="articles" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Traffic Sources"
          description={hasFilter ? "Ingestion jobs for selected cities" : "Network ingestion by platform"}
        >
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={sourcePlatforms}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="jobs" radius={[6, 6, 0, 0]} barSize={26} fill="var(--color-chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
