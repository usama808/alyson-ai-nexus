import type { CitySubscriberRow, GrowthPoint, SubscriberFilter } from "@/lib/subscribers-data";
import { countForRow, filterLabel, totalForFilter } from "@/lib/subscribers-data";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSubscribersCsv(options: {
  filter: SubscriberFilter;
  growth: GrowthPoint[];
  rows: CitySubscriberRow[];
}) {
  const { filter, growth, rows } = options;
  const stamp = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    "Alyson AI — Subscribers export",
    `Generated,${stamp}`,
    `Segment,${escapeCsv(filterLabel(filter))}`,
    `Total (${filterLabel(filter)}),${totalForFilter(rows, filter)}`,
    "",
    "Monthly growth",
    "Month,Subscribers,Unsubscribes",
    ...growth.map((g) => `${escapeCsv(g.month)},${g.subscribers},${g.unsubs}`),
    "",
    "By city",
    "City,Segment count,Total list size,Growth %,Unsubscribe %,Tag",
    ...rows.map((r) =>
      [
        escapeCsv(r.name),
        countForRow(r, filter),
        r.subscribers,
        r.growth,
        r.unsubscribePct,
        escapeCsv(r.tag),
      ].join(","),
    ),
  ];

  downloadBlob(`alyson-subscribers-${filter}-${stamp}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}

export function printSubscribersReport() {
  const prevTitle = document.title;
  document.title = `Alyson Subscribers — ${new Date().toLocaleDateString()}`;
  document.body.classList.add("subscribers-print");

  const cleanup = () => {
    document.body.classList.remove("subscribers-print");
    document.title = prevTitle;
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}
