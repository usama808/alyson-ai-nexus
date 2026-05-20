import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Globe2, FileText, MousePointerClick, Percent, DollarSign, Users, ShieldAlert, Sparkles,
  ArrowUpRight, Flame, Zap, TrendingUp, Eye, ChevronRight,
} from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { MetricCard } from "@/components/MetricCard";
import { articles, cities, pipelineStages, sourcePlatforms, sparkline, trafficSeries } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const badgeTone: Record<string, "primary" | "destructive" | "success" | "brand"> = {
  Trending: "primary", Viral: "destructive", Breaking: "destructive", "High Revenue": "success",
};

function Dashboard() {
  const top = [...articles].sort((a, b) => b.engagement - a.engagement).slice(0, 5);

  return (
    <PageShell title="Alyson Intelligence Dashboard" subtitle="Realtime overview across 50 city networks">
      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Websites" value="50" delta={4.0} data={sparkline(1)} icon={Globe2} />
        <MetricCard label="Articles Published" value="5,120" delta={8.4} data={sparkline(2)} icon={FileText} />
        <MetricCard label="Total Clicks" value="1.25M" delta={12.6} data={sparkline(3)} icon={MousePointerClick} />
        <MetricCard label="Average CTR" value="26.0%" delta={1.8} data={sparkline(4)} icon={Percent} />
        <MetricCard label="Total Revenue" value="$320K" delta={9.2} data={sparkline(5)} icon={DollarSign} />
        <MetricCard label="Subscribers" value="84,000" delta={6.4} data={sparkline(6)} icon={Users} />
        <MetricCard label="Pending Reviews" value="18" delta={-3.2} data={sparkline(7)} icon={ShieldAlert} />
        <MetricCard label="AI Articles Today" value="420" delta={18.9} data={sparkline(8)} icon={Sparkles} />
      </div>

      {/* Traffic + AI Pipeline */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          className="xl:col-span-2"
          title="Network Traffic"
          description="Clicks and revenue across all city sites — last 30 days"
          action={
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 text-xs">
              {["7d", "30d", "90d"].map((p, i) => (
                <button key={p} className={`px-2.5 py-1 rounded ${i === 1 ? "bg-muted font-semibold" : "text-muted-foreground"}`}>{p}</button>
              ))}
            </div>
          }
        >
          <div className="h-72 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficSeries}>
                <defs>
                  <linearGradient id="g-clicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="clicks" stroke="var(--color-primary)" strokeWidth={2} fill="url(#g-clicks)" />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#g-rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="AI Pipeline" description="Live job throughput" action={<Badge tone="success">Healthy</Badge>}>
          <ul className="space-y-3">
            {pipelineStages.map((s, i) => (
              <li key={s.name}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">{i + 1}</div>
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">{s.active} active · {s.queued} queued</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${s.success}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2">
            {sourcePlatforms.slice(0, 6).map((p) => (
              <div key={p.name} className="text-center">
                <div className="text-[11px] text-muted-foreground">{p.name}</div>
                <div className="text-sm font-semibold tabular-nums">{p.jobs}</div>
                <div className={`h-1 rounded-full mx-auto mt-1 w-8 ${p.status === "healthy" ? "bg-success" : "bg-warning"}`} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* City performance + Trending */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          className="xl:col-span-2"
          title="City Performance"
          description="Sorted by clicks · click a row for City Intelligence"
          action={<Link to="/cities" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5">View all <ChevronRight className="h-3 w-3" /></Link>}
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2 px-5">City</th>
                  <th className="text-right font-medium py-2 px-3">Articles</th>
                  <th className="text-right font-medium py-2 px-3">Clicks</th>
                  <th className="text-right font-medium py-2 px-3">CTR</th>
                  <th className="text-right font-medium py-2 px-3">Revenue</th>
                  <th className="text-right font-medium py-2 px-3">Subs</th>
                  <th className="text-left font-medium py-2 px-3">Top Cat.</th>
                  <th className="text-left font-medium py-2 px-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {cities.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition cursor-pointer">
                    <td className="py-2.5 px-5">
                      <Link to="/cities/$cityId" params={{ cityId: String(c.id) }} className="font-medium hover:text-primary">
                        {c.name}<span className="text-muted-foreground font-normal ml-1">{c.state}</span>
                      </Link>
                    </td>
                    <td className="text-right tabular-nums px-3">{c.articles}</td>
                    <td className="text-right tabular-nums px-3">{c.clicks.toLocaleString()}</td>
                    <td className="text-right tabular-nums px-3">{c.ctr}%</td>
                    <td className="text-right tabular-nums px-3">${(c.revenue / 1000).toFixed(1)}k</td>
                    <td className="text-right tabular-nums px-3">{c.subscribers.toLocaleString()}</td>
                    <td className="px-3 text-muted-foreground">{c.topCategory}</td>
                    <td className="px-5"><Badge tone={c.status === "active" ? "success" : "neutral"}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Trending Content" description="Top performing across the network">
          <ul className="space-y-3">
            {top.map((a) => (
              <li key={a.id} className="group p-3 -mx-2 rounded-lg hover:bg-muted/40 transition">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.badges?.map((b) => (
                        <Badge key={b} tone={badgeTone[b]}>
                          {b === "Viral" && <Flame className="h-2.5 w-2.5" />}
                          {b === "Trending" && <TrendingUp className="h-2.5 w-2.5" />}
                          {b === "Breaking" && <Zap className="h-2.5 w-2.5" />}
                          {b}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug line-clamp-2">{a.title}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{a.city}</span>·<span>{a.source}</span>·<span>{a.category}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px]">
                      <span className="tabular-nums"><Eye className="inline h-3 w-3 mr-0.5" />{a.clicks.toLocaleString()}</span>
                      <span className="tabular-nums text-success">CTR {a.ctr}%</span>
                      <span className="tabular-nums text-muted-foreground">AI {(a.aiConfidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition text-[11px] font-medium text-primary inline-flex items-center gap-0.5 self-start">
                    Promote <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Bottom row: source mix + category */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Source Mix" description="Articles ingested by platform (last 7 days)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourcePlatforms} barSize={28}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="jobs" radius={[6, 6, 0, 0]}>
                  {sourcePlatforms.map((_, i) => <Cell key={i} fill="var(--color-primary)" fillOpacity={0.4 + i * 0.1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Articles vs Revenue" description="Daily output vs monetization">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficSeries.slice(-14)}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="articles" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
