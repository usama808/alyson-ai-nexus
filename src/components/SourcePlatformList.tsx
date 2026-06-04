import { CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { Badge } from "@/components/PageShell";
import { formatRelativeTime } from "@/lib/format-time";
import type { SourcePlatformRow } from "@/lib/news-sources";

function statusBadge(p: SourcePlatformRow) {
  if (p.connection === "not_configured") {
    return <Badge tone="neutral">Not configured</Badge>;
  }
  if (p.status === "healthy") {
    return <Badge tone="success">Live</Badge>;
  }
  return <Badge tone="warning">Stale</Badge>;
}

function statusIcon(p: SourcePlatformRow) {
  if (p.connection === "not_configured") {
    return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  }
  if (p.status === "healthy") {
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  }
  return <AlertCircle className="h-4 w-4 text-warning" />;
}

export function SourcePlatformList({ platforms }: { platforms: SourcePlatformRow[] }) {
  const connected = platforms.filter((p) => p.connection === "connected");
  const planned = platforms.filter((p) => p.connection === "not_configured");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Active ingestion</p>
        <ul className="divide-y divide-border -my-2">
          {connected.map((p) => (
            <li key={p.name} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {statusIcon(p)}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.method}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {p.jobs.toLocaleString()} posts in last 48h
                    {p.lastSync && ` · last sync ${formatRelativeTime(p.lastSync)}`}
                    {p.legacyPostsInDb > 0 && ` · ${p.legacyPostsInDb} legacy rows`}
                  </div>
                </div>
              </div>
              {statusBadge(p)}
            </li>
          ))}
        </ul>
      </div>

      {planned.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Not configured</p>
          <ul className="divide-y divide-border -my-2">
            {planned.map((p) => (
              <li key={p.name} className="py-3 flex items-center justify-between gap-3 opacity-80">
                <div className="flex items-center gap-2.5 min-w-0">
                  {statusIcon(p)}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.method}</div>
                    {p.legacyPostsInDb > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {p.legacyPostsInDb.toLocaleString()} old placeholder rows in database (not ingested)
                      </div>
                    )}
                  </div>
                </div>
                {statusBadge(p)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
