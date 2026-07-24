import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { DeltaResult } from "@/lib/windsorAggregate";

interface StatTileProps {
  label: string;
  value: string;
  note?: string;
  delta?: DeltaResult | null;
  /** For metrics where a decrease is good (e.g. avg position, cost/conv). */
  invertDelta?: boolean;
}

/** KPI tile with an optional vs-previous-period delta badge. Shares the look
 *  of ReportingDashboard's internal tile, which stays private to keep the
 *  public share payload untouched. */
export function StatTile({ label, value, note, delta, invertDelta }: StatTileProps) {
  const showDelta = delta != null && delta.pct != null;
  const improved = delta?.direction === (invertDelta ? "down" : "up");
  const DeltaIcon =
    delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-bold">{value}</p>
          {showDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                delta.direction === "flat"
                  ? "text-muted-foreground"
                  : improved
                    ? "text-green-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500",
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {Math.abs(delta.pct!)}%
            </span>
          )}
        </div>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </CardContent>
    </Card>
  );
}
