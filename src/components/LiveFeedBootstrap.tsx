import { useEffect, useRef } from "react";
import { useRefreshFeed } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";

const SESSION_KEY = "alyson-feed-refreshed";

/** Pulls fresh articles from Reddit + Google News per city once per browser session. */
export function LiveFeedBootstrap() {
  const refresh = useRefreshFeed();
  const started = useRef(false);

  useEffect(() => {
    if (!isLiveApiEnabled()) return;
    if (import.meta.env.VITE_AUTO_REFRESH_FEED !== "true") return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;
    if (started.current) return;
    started.current = true;

    refresh.mutate(undefined, {
      onSettled: () => {
        sessionStorage.setItem(SESSION_KEY, new Date().toISOString());
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
