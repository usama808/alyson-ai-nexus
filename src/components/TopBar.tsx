import { Search, CircleDot } from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="h-16 flex items-center justify-between gap-4 px-8 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="flex flex-col leading-tight min-w-0">
        <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search articles, cities, sources..."
            className="h-9 w-80 pl-8 pr-3 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition"
          />
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card border border-border">
          <CircleDot className="h-3 w-3 text-success animate-pulse" />
          <span className="text-xs font-medium">AI Online</span>
        </div>
        <NotificationsBell />
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center text-primary-foreground text-xs font-semibold">
          AD
        </div>
      </div>
    </header>
  );
}
