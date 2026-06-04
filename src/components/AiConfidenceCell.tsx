import { cn } from "@/lib/utils";

const TIP =
  "AI confidence scores how trustworthy the latest AI-generated text is (source match, length, clarity). Run Summarize or Rewrite in the editor to refresh. ≥90% may auto-publish; below 70% needs review.";

export function AiConfidenceHeader({
  active,
  sortOrder,
  onSort,
}: {
  active?: boolean;
  sortOrder?: "asc" | "desc";
  onSort?: () => void;
}) {
  return (
    <th
      className={`py-2 px-3 text-right font-medium ${onSort ? "cursor-pointer hover:text-foreground" : "cursor-help"} ${active ? "text-primary" : ""}`}
      title={TIP}
      onClick={onSort}
    >
      AI confidence
      {active && sortOrder && (sortOrder === "desc" ? " ↓" : " ↑")}
    </th>
  );
}

export function AiConfidenceCell({ score }: { score: number }) {
  const pct = Math.round((score ?? 0) * 100);
  const tone =
    pct >= 90 ? "text-success font-medium" : pct >= 70 ? "text-foreground" : pct > 0 ? "text-warning font-medium" : "text-muted-foreground";

  return (
    <td className={cn("px-3 text-right tabular-nums", tone)} title={TIP}>
      {pct > 0 ? `${pct}%` : "—"}
    </td>
  );
}
