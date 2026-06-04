import { cities as mockCities } from "@/lib/mock-data";

export type SubscriberFilter = "all" | "active" | "vip" | "unsubscribed";

export type CitySubscriberRow = {
  id: number;
  name: string;
  subscribers: number;
  active: number;
  vip: number;
  unsubscribed: number;
  growth: number;
  unsubscribePct: number;
  tag: string;
};

export type GrowthPoint = {
  month: string;
  subscribers: number;
  unsubs: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function hash(id: number, salt: number): number {
  const x = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export type SubscriberCitySource = {
  id: number;
  name: string;
  subscribers: number;
  topCategory?: string;
};

export function buildCitySubscriberRows(pool: SubscriberCitySource[]): CitySubscriberRow[] {
  return pool.map((c) => {
    const subscribers = Math.max(0, Number(c.subscribers) || 0);
    const unsubRate = 0.005 + hash(c.id, 1) * 0.02;
    const unsubscribed = subscribers > 0 ? Math.max(1, Math.round(subscribers * unsubRate)) : 0;
    const vip = subscribers > 0 ? Math.max(1, Math.round(subscribers * (0.04 + hash(c.id, 2) * 0.06))) : 0;
    const active = Math.max(0, subscribers - unsubscribed);
    return {
      id: c.id,
      name: c.name,
      subscribers,
      active,
      vip,
      unsubscribed,
      growth: Math.round((2 + hash(c.id, 3) * 7) * 10) / 10,
      unsubscribePct: Math.round(unsubRate * 1000) / 10,
      tag: c.topCategory ?? "Local News",
    };
  });
}

export const defaultSubscriberRows = buildCitySubscriberRows(
  mockCities.map((c) => ({
    id: c.id,
    name: c.name,
    subscribers: c.subscribers,
    topCategory: c.topCategory,
  })),
);

export function totalForFilter(rows: CitySubscriberRow[], filter: SubscriberFilter): number {
  switch (filter) {
    case "active":
      return rows.reduce((s, r) => s + r.active, 0);
    case "vip":
      return rows.reduce((s, r) => s + r.vip, 0);
    case "unsubscribed":
      return rows.reduce((s, r) => s + r.unsubscribed, 0);
    default:
      return rows.reduce((s, r) => s + r.subscribers, 0);
  }
}

export function countForRow(row: CitySubscriberRow, filter: SubscriberFilter): number {
  switch (filter) {
    case "active":
      return row.active;
    case "vip":
      return row.vip;
    case "unsubscribed":
      return row.unsubscribed;
    default:
      return row.subscribers;
  }
}

export function filterCityRows(rows: CitySubscriberRow[], filter: SubscriberFilter): CitySubscriberRow[] {
  if (filter === "all") return rows;
  return rows.filter((r) => countForRow(r, filter) > 0);
}

/** Deterministic monthly growth (no Math.random per render). */
export function buildGrowthSeries(filter: SubscriberFilter, rows: CitySubscriberRow[]): GrowthPoint[] {
  const networkTotal = totalForFilter(rows, "all");
  const filteredTotal = totalForFilter(rows, filter);
  const scale = filter === "all" || networkTotal === 0 ? 1 : filteredTotal / networkTotal;

  return MONTHS.map((month, i) => {
    const baseSubs = 22000 + i * 5200 + Math.round(Math.sin(i * 0.9) * 1200);
    const baseUnsubs = 200 + Math.round(Math.sin(i * 1.1) * 80) + i * 12;
    return {
      month,
      subscribers: Math.round(baseSubs * scale),
      unsubs:
        filter === "unsubscribed"
          ? Math.round(baseUnsubs * Math.max(scale, 0.4) * 1.4)
          : Math.round(baseUnsubs * scale),
    };
  });
}

export function filterLabel(filter: SubscriberFilter): string {
  return {
    all: "All subscribers",
    active: "Active subscribers",
    vip: "VIP segment",
    unsubscribed: "Unsubscribed",
  }[filter];
}

export const QUICK_FILTERS: { id: SubscriberFilter; label: string; icon: "active" | "vip" | "unsubscribed" }[] = [
  { id: "active", label: "Active subscribers", icon: "active" },
  { id: "vip", label: "VIP segment", icon: "vip" },
  { id: "unsubscribed", label: "Unsubscribed", icon: "unsubscribed" },
];
