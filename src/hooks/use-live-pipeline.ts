import { useQuery } from "@tanstack/react-query";
import { fetchLivePipeline, isLiveApiEnabled } from "@/lib/api-client";
import { pipelineStages } from "@/lib/mock-data";
import { MOCK_SOURCE_PLATFORMS } from "@/lib/news-sources";

export const pipelineKeys = {
  all: ["live-pipeline"] as const,
};

const MOCK_EVENTS = [
  { id: 1, message: "Demo mode — connect API for live job stream", status: "info" as const, at: new Date().toISOString() },
];

export function useLivePipeline() {
  const live = isLiveApiEnabled();

  return useQuery({
    queryKey: pipelineKeys.all,
    queryFn: fetchLivePipeline,
    enabled: live,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

export const mockPipelineFallback = {
  pipelineStages,
  sourcePlatforms: MOCK_SOURCE_PLATFORMS,
  recentEvents: MOCK_EVENTS,
  summary: { liveAi: false, lastScrapeAt: null },
};
