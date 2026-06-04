import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles, Loader2 } from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { articles as mockArticles } from "@/lib/mock-data";
import {
  DEFAULT_RANKING_WEIGHTS,
  normalizeWeights,
  scoreArticleMock,
  type RankingWeights,
} from "@/lib/ranking";
import { useLiveCities } from "@/hooks/use-live-feed";
import {
  useRankingWeights,
  useRankedArticles,
  useSaveRankingWeights,
  useRecalculateRankings,
} from "@/hooks/use-rankings";
import { isLiveApiEnabled } from "@/lib/api-client";
import { formatStateName } from "@/lib/us-states";

export const Route = createFileRoute("/rankings")({
  component: RankingsPage,
});

const WEIGHT_FIELDS: { key: keyof RankingWeights; label: string }[] = [
  { key: "ctr", label: "CTR weight" },
  { key: "engagement", label: "Engagement weight" },
  { key: "freshness", label: "Freshness weight" },
  { key: "revenue", label: "Revenue weight" },
];

function RankingsPage() {
  const live = isLiveApiEnabled();
  const { data: citiesRes } = useLiveCities();
  const { data: weightsRes } = useRankingWeights();
  const saveWeights = useSaveRankingWeights();
  const recalculate = useRecalculateRankings();

  const [cityId, setCityId] = useState<number | "all">("all");
  const [weights, setWeights] = useState<RankingWeights>(DEFAULT_RANKING_WEIGHTS);
  const [autoRank, setAutoRank] = useState(true);
  const [abTesting, setAbTesting] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (weightsRes && !initialized) {
      setWeights(weightsRes.weights);
      setAutoRank(weightsRes.autoRank);
      setInitialized(true);
    }
  }, [weightsRes, initialized]);

  const selectedCityId = cityId === "all" ? undefined : cityId;

  const { data: rankedLive, isLoading: rankedLoading } = useRankedArticles(
    selectedCityId,
    weights,
    live && initialized,
  );

  const mockRanked = useMemo(() => {
    const list = cityId === "all" ? mockArticles : mockArticles.filter((a) => {
      const city = citiesRes?.cities.find((c) => c.id === cityId);
      return city ? a.city === city.name : true;
    });
    return [...list]
      .map((a) => ({
        id: a.id,
        title: a.title,
        city: a.city,
        cityId: 0,
        category: a.category,
        ctr: a.ctr,
        clicks: a.clicks,
        engagement: a.engagement,
        revenue: a.revenue,
        aiConfidence: a.aiConfidence,
        score: scoreArticleMock(a, weights),
      }))
      .sort((a, b) => b.score - a.score);
  }, [weights, cityId, citiesRes?.cities]);

  const ranked = live ? (rankedLive ?? []) : mockRanked;
  const top = ranked[0];
  const weightSum = weights.ctr + weights.engagement + weights.freshness + weights.revenue;
  const normalized = normalizeWeights(weights);

  const handleApply = () => {
    if (!live) return;
    const normalizedForSave = normalizeWeights(weights);
    setWeights(normalizedForSave);
    saveWeights.mutate(
      { weights: normalizedForSave, autoRank },
      {
        onSuccess: () => {
          recalculate.mutate({ cityId: selectedCityId, weights: normalizedForSave });
        },
      },
    );
  };

  const busy = saveWeights.isPending || recalculate.isPending;

  return (
    <PageShell title="Ranking Engine" subtitle="Homepage optimization & weight tuning">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {live && (
          <>
            <label className="text-xs text-muted-foreground font-medium">City</label>
            <select
              value={cityId}
              onChange={(e) =>
                setCityId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              className="h-9 px-3 text-sm rounded-md border border-border bg-card"
            >
              <option value="all">All cities</option>
              {(citiesRes?.cities ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {formatStateName(c.state)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApply}
              disabled={busy || weightSum === 0}
              className="h-9 px-4 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Apply weights & recalculate
            </button>
            <span className="text-xs text-muted-foreground">Weights sum to {weightSum}%</span>
          </>
        )}
        {!live && (
          <span className="text-xs text-muted-foreground">
            Set VITE_API_URL to sync weights with the backend
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          className="xl:col-span-2"
          title="Homepage Ranking"
          description={`Score = CTR (${normalized.ctr}%) + engagement (${normalized.engagement}%) + freshness (${normalized.freshness}%) + revenue (${normalized.revenue}%)`}
        >
          {rankedLoading && live ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Calculating rankings…</p>
          ) : ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No articles to rank. Refresh live articles from the dashboard first.
            </p>
          ) : (
            <ul className="divide-y divide-border -my-2">
              {ranked.slice(0, 10).map((a, i) => (
                <li key={a.id} className="py-3 flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold ${
                      i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.city} · CTR {a.ctr}% · Engagement {a.engagement}
                      {live && a.breakdown && (
                        <>
                          {" "}
                          · fresh +{a.breakdown.freshnessComponent}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{a.score}</div>
                    <div className="text-[10px] text-muted-foreground">score</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Ranking Weights"
            action={
              <Badge tone={autoRank ? "success" : "neutral"}>
                {autoRank ? "Auto-rank ON" : "Auto-rank OFF"}
              </Badge>
            }
          >
            <div className="space-y-4">
              {WEIGHT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium">{label}</span>
                    <span className="tabular-nums text-muted-foreground">{weights[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[key]}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))
                    }
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAutoRank((v) => !v)}
                className="w-full pt-2 flex items-center justify-between text-xs"
              >
                <span>Auto-rank on schedule</span>
                <div
                  className={`h-5 w-9 rounded-full relative transition ${autoRank ? "bg-primary" : "bg-muted"}`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-card transition-all ${
                      autoRank ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAbTesting((v) => !v)}
                className="w-full flex items-center justify-between text-xs"
              >
                <span>A/B headline testing</span>
                <div
                  className={`h-5 w-9 rounded-full relative transition ${abTesting ? "bg-primary" : "bg-muted"}`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-card transition-all ${
                      abTesting ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>
          </SectionCard>

          {top && (
            <SectionCard title="Why this ranked high" action={<Sparkles className="h-3.5 w-3.5 text-primary" />}>
              <p className="text-xs text-muted-foreground line-clamp-2">&quot;{top.title}&quot; leads because:</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex items-center justify-between">
                  <span>CTR contribution</span>
                  <Badge tone="success">
                    {live && top.breakdown ? `+${top.breakdown.ctrComponent}` : `${top.ctr}%`}
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Engagement</span>
                  <Badge tone="success">
                    {live && top.breakdown
                      ? `+${top.breakdown.engagementComponent}`
                      : `${top.engagement}`}
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Freshness</span>
                  <Badge tone="primary">
                    {live && top.breakdown ? `+${top.breakdown.freshnessComponent}` : "High"}
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Revenue impact</span>
                  <Badge tone="success">
                    ${live && top.breakdown ? top.breakdown.revenueComponent.toFixed(1) : top.revenue.toLocaleString()}
                  </Badge>
                </li>
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      <div className="mt-4">
        <SectionCard title="Score Distribution">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={ranked.slice(0, 12)}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="id"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
