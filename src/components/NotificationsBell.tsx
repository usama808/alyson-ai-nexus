import { Link } from "@tanstack/react-router";
import { Bell, FileText, RefreshCw, ShieldAlert } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLiveArticles } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";
import { articles as mockArticles } from "@/lib/mock-data";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  to: string;
  params?: { articleId: string };
  icon: "review" | "draft" | "feed";
  time: string;
};

function useNotifications(): NotificationItem[] {
  const live = isLiveApiEnabled();
  const { data } = useLiveArticles({ limit: 100 });
  const articles = live ? (data?.articles ?? []) : mockArticles;

  const items: NotificationItem[] = [];

  const pending = articles.filter((a) => a.status === "Pending Review");
  for (const a of pending.slice(0, 4)) {
    items.push({
      id: `review-${a.id}`,
      title: "Review required",
      message: a.title,
      to: "/articles/$articleId",
      params: { articleId: String(a.id) },
      icon: "review",
      time: "Pending",
    });
  }

  const drafts = articles.filter((a) => a.status === "Draft");
  if (drafts.length > 0) {
    items.push({
      id: "drafts-summary",
      title: `${drafts.length} draft article${drafts.length === 1 ? "" : "s"}`,
      message: "New stories ingested from live feeds",
      to: "/articles",
      icon: "draft",
      time: "Today",
    });
  }

  if (typeof sessionStorage !== "undefined") {
    const refreshed = sessionStorage.getItem("alyson-feed-refreshed");
    if (refreshed) {
      items.push({
        id: "feed-refresh",
        title: "Live feed updated",
        message: "City news pulled from Reddit & Google News",
        to: "/",
        icon: "feed",
        time: new Date(refreshed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
  }

  if (items.length === 0) {
    items.push({
      id: "all-clear",
      title: "You're all caught up",
      message: "No pending reviews or alerts right now",
      to: "/",
      icon: "feed",
      time: "",
    });
  }

  return items;
}

function NotificationIcon({ type }: { type: NotificationItem["icon"] }) {
  const cls = "h-4 w-4 shrink-0";
  if (type === "review") return <ShieldAlert className={`${cls} text-warning`} />;
  if (type === "draft") return <FileText className={`${cls} text-primary`} />;
  return <RefreshCw className={`${cls} text-muted-foreground`} />;
}

export function NotificationsBell() {
  const notifications = useNotifications();
  const unreadCount = notifications.filter((n) => n.id !== "all-clear").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} items` : ""}`}
          className="h-9 w-9 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition relative focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} update${unreadCount === 1 ? "" : "s"}` : "No new alerts"}
          </p>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                to={n.to}
                params={n.params}
                className="flex gap-3 px-4 py-2.5 hover:bg-muted/60 transition text-left"
              >
                <div className="mt-0.5">
                  <NotificationIcon type={n.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                  {n.time && (
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{n.time}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <Link to="/moderation" className="text-xs font-medium text-primary hover:underline">
              Open moderation queue →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
