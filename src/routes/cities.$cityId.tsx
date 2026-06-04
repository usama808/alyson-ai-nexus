import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ExternalLink, Send } from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { articles as mockArticles, campaigns, cities as mockCities } from "@/lib/mock-data";
import { useLiveArticles, useLiveCities } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";
import { RefreshFeedButton } from "@/components/RefreshFeedButton";
import {
  buildCitySourcePlatforms,
  buildCityTrafficSeries,
  type AnalyticsCity,
} from "@/lib/analytics-data";
import { AiConfidenceCell } from "@/components/AiConfidenceCell";
import { cn } from "@/lib/utils";
import type { LiveCity } from "@/lib/types";
import { formatStateName } from "@/lib/us-states";

export const Route = createFileRoute("/cities/$cityId")({
  component: CityDetail,
});

type CityTab = "overview" | "articles" | "analytics" | "email" | "seo" | "settings";

const TABS: { id: CityTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "articles", label: "Articles" },
  { id: "analytics", label: "Analytics" },
  { id: "email", label: "Email Campaigns" },
  { id: "seo", label: "SEO" },
  { id: "settings", label: "Settings" },
];

function toAnalyticsCity(city: LiveCity): AnalyticsCity {
  return {
    id: city.id,
    name: city.name,
    clicks: city.clicks,
    revenue: city.revenue,
    articles: city.articles,
  };
}

function CityDetail() {
  const { cityId } = Route.useParams();
  const id = Number(cityId);
  const [tab, setTab] = useState<CityTab>("overview");
  const live = isLiveApiEnabled();
  const { data: cityRes } = useLiveCities();
  const { data: articleRes, isLoading } = useLiveArticles({ cityId: id, limit: 100 });

  const cities = live ? (cityRes?.cities ?? []) : mockCities;
  const city = cities.find((c) => c.id === id);
  if (!city) throw notFound();

  const analyticsCity = toAnalyticsCity(city);
  const trafficSeries = useMemo(() => buildCityTrafficSeries(analyticsCity), [analyticsCity]);
  const sourcePlatforms = useMemo(() => buildCitySourcePlatforms(analyticsCity), [analyticsCity]);
  const growthSeries = useMemo(() => trafficSeries.slice(-14), [trafficSeries]);

  const cityArticles = live
    ? (articleRes?.articles ?? [])
    : mockArticles.filter((a) => a.city === city.name);

  const cityCampaigns = useMemo(() => {
    const matched = campaigns.filter((c) => c.city === city.name);
    if (matched.length > 0) return matched;
    return [
      {
        id: 9000 + city.id,
        title: `${city.name} Daily Digest`,
        city: city.name,
        type: "Daily Newsletter",
        sent: Math.max(500, Math.round(city.subscribers * 0.4)),
        open: 38 + (city.id % 8),
        click: 12 + (city.id % 6),
        revenue: Math.round(city.revenue * 0.04),
      },
      {
        id: 9100 + city.id,
        title: `${city.name} Breaking Alerts`,
        city: city.name,
        type: "Trending Alerts",
        sent: Math.max(200, Math.round(city.subscribers * 0.15)),
        open: 41 + (city.id % 5),
        click: 15 + (city.id % 4),
        revenue: Math.round(city.revenue * 0.02),
      },
    ];
  }, [city]);

  const metricCards = [
    { l: "Articles", v: city.articles },
    { l: "Clicks", v: city.clicks.toLocaleString() },
    { l: "CTR", v: `${city.ctr}%` },
    { l: "Revenue", v: `$${(city.revenue / 1000).toFixed(1)}k` },
  ];

  return (
    <PageShell
      title={`${city.name} Intelligence`}
      subtitle={`${city.subdomain} · ${city.population.toLocaleString()} population`}
      actions={live ? <RefreshFeedButton cityId={id} /> : undefined}
    >
      <Link to="/cities" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="h-3 w-3" /> All cities
      </Link>

      <div className="border-b border-border mb-6 -mt-2">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="City sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-sm border-b-2 -mb-px transition whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metricCards.map((m) => (
          <div key={m.l} className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{m.l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{m.v}</div>
          </div>
        ))}
      </div>

      {tab === "overview" && (
        <CityOverviewTab
          city={city}
          trafficSeries={trafficSeries}
          cityArticles={cityArticles}
          isLoading={isLoading && live}
        />
      )}

      {tab === "articles" && (
        <CityArticlesTab cityArticles={cityArticles} isLoading={isLoading && live} />
      )}

      {tab === "analytics" && (
        <CityAnalyticsTab
          cityName={city.name}
          trafficSeries={trafficSeries}
          growthSeries={growthSeries}
          sourcePlatforms={sourcePlatforms}
        />
      )}

      {tab === "email" && <CityEmailTab city={city} campaigns={cityCampaigns} />}

      {tab === "seo" && <CitySeoTab city={city} />}

      {tab === "settings" && <CitySettingsTab city={city} />}
    </PageShell>
  );
}

function CityOverviewTab({
  city,
  trafficSeries,
  cityArticles,
  isLoading,
}: {
  city: LiveCity;
  trafficSeries: ReturnType<typeof buildCityTrafficSeries>;
  cityArticles: { id: number; title: string; category: string; clicks: number; ctr: number }[];
  isLoading: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard className="xl:col-span-2" title="Traffic" description="Last 30 days">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={trafficSeries}>
                <defs>
                  <linearGradient id="ct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="clicks" stroke="var(--color-primary)" strokeWidth={2} fill="url(#ct)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Top Categories">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={[
                  { name: city.topCategory, v: 92 },
                  { name: "Local News", v: 78 },
                  { name: "Sports", v: 64 },
                  { name: "Business", v: 51 },
                  { name: "Trending", v: 39 },
                ]}
              >
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={84} />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Top Performing Articles">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading articles…</p>
          ) : (
            <ul className="divide-y divide-border -my-2">
              {cityArticles.slice(0, 5).map((a) => (
                <li key={a.id} className="py-3">
                  <Link
                    to="/articles/$articleId"
                    params={{ articleId: String(a.id) }}
                    className="text-sm font-medium line-clamp-1 hover:text-primary"
                  >
                    {a.title}
                  </Link>
                  <div className="mt-1 text-[11px] text-muted-foreground flex gap-3 tabular-nums">
                    <span>{a.category}</span>·<span>{a.clicks.toLocaleString()} clicks</span>·<span>CTR {a.ctr}%</span>
                  </div>
                </li>
              ))}
              {cityArticles.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground text-center">No articles yet for this city.</li>
              )}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Engagement Heatmap" description="Hour × day of week">
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 7 * 12 }, (_, i) => {
              const v = (Math.sin(i / 3) + Math.cos(i / 5) + 2) / 4;
              return <div key={i} className="aspect-square rounded-sm" style={{ background: `oklch(0.623 0.188 259.815 / ${0.08 + v * 0.7})` }} />;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">{[0.1, 0.25, 0.45, 0.65, 0.85].map((o) => <div key={o} className="h-2 w-3 rounded-sm" style={{ background: `oklch(0.623 0.188 259.815 / ${o})` }} />)}</div>
            <span>More</span>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function CityArticlesTab({
  cityArticles,
  isLoading,
}: {
  cityArticles: {
    id: number;
    title: string;
    category: string;
    status: string;
    source: string;
    sourceUrl?: string | null;
    ctr: number;
    clicks: number;
    revenue: number;
    aiConfidence: number;
    publishedAt: string;
  }[];
  isLoading: boolean;
}) {
  return (
    <SectionCard title="All articles" description="Articles ingested for this city">
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading articles…</p>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pl-5 pr-3 text-left font-medium">Title</th>
                <th className="py-2 px-3 text-left font-medium">Category</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-right font-medium">AI confidence</th>
                <th className="py-2 px-3 text-right font-medium">CTR</th>
                <th className="py-2 px-3 text-right font-medium">Revenue</th>
                <th className="py-2 pr-5 pl-3 text-left font-medium">Published</th>
              </tr>
            </thead>
            <tbody>
              {cityArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    No articles for this city yet.
                  </td>
                </tr>
              ) : (
                cityArticles.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition">
                    <td className="py-2.5 pl-5 pr-3 max-w-md">
                      <Link
                        to="/articles/$articleId"
                        params={{ articleId: String(a.id) }}
                        className="font-medium line-clamp-1 hover:text-primary"
                      >
                        {a.title}
                      </Link>
                      {a.sourceUrl && (
                        <a
                          href={a.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          Source <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </td>
                    <td className="px-3 text-muted-foreground">{a.category}</td>
                    <td className="px-3">
                      <Badge>{a.status}</Badge>
                    </td>
                    <AiConfidenceCell score={a.aiConfidence} />
                    <td className="px-3 text-right tabular-nums">{a.ctr}%</td>
                    <td className="px-3 text-right tabular-nums">${a.revenue.toLocaleString()}</td>
                    <td className="px-3 pr-5 text-muted-foreground tabular-nums">{a.publishedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function CityAnalyticsTab({
  cityName,
  trafficSeries,
  growthSeries,
  sourcePlatforms,
}: {
  cityName: string;
  trafficSeries: ReturnType<typeof buildCityTrafficSeries>;
  growthSeries: ReturnType<typeof buildCityTrafficSeries>;
  sourcePlatforms: ReturnType<typeof buildCitySourcePlatforms>;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SectionCard title="Traffic & revenue" description={`${cityName} · last 30 days`}>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={trafficSeries}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="clicks" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.15} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2, var(--color-muted-foreground))" strokeWidth={2} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Article output" description="Last 14 days">
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={growthSeries}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="articles" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard className="xl:col-span-2" title="Source mix" description="Ingestion by platform">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pl-5 pr-3 text-left font-medium">Platform</th>
                <th className="py-2 px-3 text-right font-medium">Jobs (7d)</th>
                <th className="py-2 pr-5 pl-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sourcePlatforms.map((s) => (
                <tr key={s.name} className="border-b border-border last:border-0">
                  <td className="py-2.5 pl-5 pr-3 font-medium">{s.name}</td>
                  <td className="px-3 text-right tabular-nums">{s.jobs.toLocaleString()}</td>
                  <td className="pr-5 pl-3">
                    <Badge tone={s.status === "healthy" ? "success" : "warning"}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function CityEmailTab({
  city,
  campaigns: rows,
}: {
  city: LiveCity;
  campaigns: typeof campaigns;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <SectionCard
        className="xl:col-span-2"
        title="Campaigns"
        description={`Newsletters for ${city.name}`}
        action={
          <button
            type="button"
            className="h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 font-medium hover:bg-primary/90"
          >
            <Send className="h-3 w-3" /> Send now
          </button>
        }
      >
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 px-5 text-left font-medium">Campaign</th>
                <th className="py-2 px-3 text-left font-medium">Type</th>
                <th className="py-2 px-3 text-right font-medium">Sent</th>
                <th className="py-2 px-3 text-right font-medium">Open</th>
                <th className="py-2 px-3 text-right font-medium">Click</th>
                <th className="py-2 px-5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition">
                  <td className="py-2.5 px-5 font-medium">{c.title}</td>
                  <td className="px-3">
                    <Badge tone="primary">{c.type}</Badge>
                  </td>
                  <td className="px-3 text-right tabular-nums">{c.sent.toLocaleString()}</td>
                  <td className="px-3 text-right tabular-nums">{c.open}%</td>
                  <td className="px-3 text-right tabular-nums">{c.click}%</td>
                  <td className="px-5 text-right tabular-nums">${c.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Subscribers" description={city.subdomain}>
        <dl className="divide-y divide-border -my-2 text-sm">
          <div className="py-2.5 flex justify-between">
            <dt className="text-muted-foreground">Active subscribers</dt>
            <dd className="font-semibold tabular-nums">{city.subscribers.toLocaleString()}</dd>
          </div>
          <div className="py-2.5 flex justify-between">
            <dt className="text-muted-foreground">Est. list growth</dt>
            <dd className="font-semibold text-success">+{(4 + (city.id % 5)).toFixed(1)}%</dd>
          </div>
          <div className="py-2.5 flex justify-between">
            <dt className="text-muted-foreground">Avg open rate</dt>
            <dd className="font-semibold tabular-nums">{38 + (city.id % 10)}%</dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  );
}

function CitySeoTab({ city }: { city: LiveCity }) {
  const slug = city.slug ?? city.name.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionCard title="Site SEO" description={`Public site: ${city.subdomain}`}>
        <dl className="divide-y divide-border -my-2 text-sm">
          {[
            ["Site title", `${city.name} Local News | Alyson`],
            ["Meta description", `Breaking news and local stories for ${city.name}, ${formatStateName(city.state)}.`],
            ["Canonical URL", `https://${city.subdomain}`],
            ["Sitemap", `https://${city.subdomain}/sitemap.xml`],
            ["Robots", "index, follow"],
          ].map(([k, v]) => (
            <div key={k} className="py-2.5 flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-muted-foreground shrink-0">{k}</dt>
              <dd className="font-medium text-right sm:max-w-[60%] break-all">{v}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard title="Structured data & social">
        <dl className="divide-y divide-border -my-2 text-sm">
          {[
            ["OG image", `https://${city.subdomain}/og/${slug}.png`],
            ["Twitter card", "summary_large_image"],
            ["Schema.org", "NewsMediaOrganization"],
            ["Hreflang", "en-US"],
          ].map(([k, v]) => (
            <div key={k} className="py-2.5 flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  );
}

function CitySettingsTab({ city }: { city: LiveCity }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionCard title="City site" description="Network configuration for this market">
        <dl className="divide-y divide-border -my-2 text-sm">
          {[
            ["Status", city.status],
            ["Subdomain", city.subdomain],
            ["Population", city.population.toLocaleString()],
            ["Top category", city.topCategory],
            ["Auto-publish threshold", "AI confidence ≥ 90%"],
          ].map(([k, v]) => (
            <div key={k} className="py-2.5 flex justify-between">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium capitalize">{v}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard title="Ingestion & automation">
        <dl className="divide-y divide-border -my-2 text-sm">
          {[
            ["Scrape interval", "60s (Reddit) · 120s (social)"],
            ["Daily article cap", "200"],
            ["Ranking refresh", "Every 5 min"],
            ["Email digest", "Daily 7:00 AM local"],
          ].map(([k, v]) => (
            <div key={k} className="py-2.5 flex justify-between gap-4">
              <dt className="text-muted-foreground shrink-0">{k}</dt>
              <dd className="font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Network-wide defaults are in{" "}
          <Link to="/settings" className="text-primary hover:underline">
            Settings
          </Link>
          .
        </p>
      </SectionCard>
    </div>
  );
}
