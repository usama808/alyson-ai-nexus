import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RefreshCw } from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { SourcePlatformList } from "@/components/SourcePlatformList";
import { pipelineStages as mockStages } from "@/lib/mock-data";
import { MOCK_SOURCE_PLATFORMS } from "@/lib/news-sources";
import { useLivePipeline } from "@/hooks/use-live-pipeline";
import { isLiveApiEnabled } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/format-time";
import { RefreshFeedButton } from "@/components/RefreshFeedButton";
import { useQueryClient } from "@tanstack/react-query";
import { pipelineKeys } from "@/hooks/use-live-pipeline";
import { eventIcon, eventClass } from "@/lib/pipeline-events";

export const Route = createFileRoute("/ai-pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const live = isLiveApiEnabled();
  const qc = useQueryClient();
  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useLivePipeline();

  const stages = data?.pipelineStages ?? (live ? [] : mockStages);
  const platforms = data?.sourcePlatforms ?? (live ? [] : MOCK_SOURCE_PLATFORMS);
  const events = data?.recentEvents ?? [];
  const summary = data?.summary;

  const connectedLive = platforms.some((p) => p.connection === "connected" && p.status === "healthy");

  return (
    <PageShell
      title="AI Pipeline"
      subtitle={
        live
          ? summary?.liveAi
            ? "Live jobs · articles ingested from Google News, Reddit & BBC"
            : "Live jobs · enable OpenAI for AI summarization"
          : "Demo pipeline (set VITE_API_URL for live data)"
      }
      actions={
        live ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => qc.invalidateQueries({ queryKey: pipelineKeys.all })}
              className="h-9 px-3 text-sm rounded-md border border-border bg-card hover:bg-muted inline-flex items-center gap-1.5"
            >
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
            <RefreshFeedButton />
          </div>
        ) : undefined
      }
    >
      {live && isError && (
        <p className="mb-4 text-sm text-destructive">Could not load pipeline — is the API running on port 4000?</p>
      )}

      {live && summary?.lastScrapeAt && (
        <p className="mb-4 text-xs text-muted-foreground">
          Last real ingest: {formatRelativeTime(summary.lastScrapeAt)}
          {dataUpdatedAt > 0 && ` · Updated ${formatRelativeTime(new Date(dataUpdatedAt).toISOString())}`}
        </p>
      )}

      {isLoading && live && stages.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading pipeline…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 mb-6">
            {stages.map((s, i) => (
              <div key={s.name} className="bg-card border border-border rounded-xl p-4 shadow-card relative">
                <div className="text-[11px] text-muted-foreground">Stage {i + 1}</div>
                <div className="mt-1 text-sm font-semibold">{s.name}</div>
                <div className="mt-3 text-2xl font-semibold tabular-nums">{s.active}</div>
                <div className="text-[11px] text-muted-foreground">active</div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Queue {s.queued}</span>
                  <Badge tone={s.success >= 98 ? "success" : s.success >= 90 ? "warning" : "destructive"}>
                    {s.success}%
                  </Badge>
                </div>
                {i < stages.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-border">→</div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="Source Platforms"
              description="Only Google News, Reddit & BBC pull new articles on refresh"
              action={
                <Badge tone={connectedLive ? "success" : "warning"}>
                  {connectedLive ? "Ingestion live" : "Check sources"}
                </Badge>
              }
            >
              <SourcePlatformList platforms={platforms} />
            </SectionCard>

            <SectionCard title="Recent Events" description="System job activity (newest first)">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No jobs yet. Use Refresh feed on the dashboard to run a scrape.
                </p>
              ) : (
                <ul className="space-y-3 text-sm max-h-80 overflow-y-auto">
                  {events.map((e) => {
                    const Icon = eventIcon[e.status];
                    return (
                      <li key={e.id} className="flex items-start gap-2.5">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${eventClass[e.status]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="leading-snug">{e.message}</div>
                          <div className="text-[11px] text-muted-foreground">{formatRelativeTime(e.at)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </PageShell>
  );
}
