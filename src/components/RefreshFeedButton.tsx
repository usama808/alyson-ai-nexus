import { RefreshCw } from "lucide-react";
import { useRefreshFeed } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";

export function RefreshFeedButton({ cityId, className }: { cityId?: number; className?: string }) {
  const refresh = useRefreshFeed();

  if (!isLiveApiEnabled()) return null;

  return (
    <button
      type="button"
      disabled={refresh.isPending}
      onClick={() => refresh.mutate(cityId)}
      className={
        className ??
        "inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-border bg-card hover:bg-muted transition disabled:opacity-50"
      }
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
      {refresh.isPending ? "Fetching live news…" : "Refresh live articles"}
    </button>
  );
}
