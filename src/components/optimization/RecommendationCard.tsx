import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface RecommendationCardProps {
  recommendation: {
    id: string;
    page_url: string | null;
    category: string;
    subcategory: string;
    priority: string;
    doctrine_rule: string | null;
    current_value: string | null;
    proposed_value: string | null;
    ai_reasoning: string | null;
    baseline_metrics: Record<string, unknown> | null;
    status: string;
    applied_at: string | null;
    outcome_metrics: Record<string, unknown> | null;
    created_at: string;
  };
  onStatusChange: (id: string, status: string) => void;
  isUpdating?: boolean;
}

function getPriorityBadgeProps(priority: string): {
  variant: "destructive" | "default" | "secondary" | "outline";
  className?: string;
} {
  switch (priority) {
    case "critical":
      return { variant: "destructive" };
    case "high":
      return {
        variant: "outline",
        className:
          "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
      };
    case "medium":
      return { variant: "default" };
    case "low":
      return { variant: "secondary" };
    default:
      return { variant: "default" };
  }
}

function getStatusBorderClass(status: string): string {
  switch (status) {
    case "approved":
      return "border-l-4 border-l-green-500";
    case "applied":
    case "monitoring":
      return "border-l-4 border-l-blue-500";
    case "succeeded":
      return "bg-green-50/50 dark:bg-green-950/20";
    case "regressed":
      return "bg-red-50/50 dark:bg-red-950/20";
    case "reverted":
      return "opacity-60";
    default:
      return "";
  }
}

function MetricsGrid({
  label,
  metrics,
}: {
  label: string;
  metrics: Record<string, unknown>;
}) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;

  return (
    <div className="flex-1">
      <div className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </div>
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">
              {key.replace(/_/g, " ")}
            </span>
            <span className="font-medium">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecommendationCard({
  recommendation: rec,
  onStatusChange,
  isUpdating = false,
}: RecommendationCardProps) {
  const priorityProps = getPriorityBadgeProps(rec.priority);
  const statusBorder = getStatusBorderClass(rec.status);

  const showMonitoringMetrics =
    (rec.status === "monitoring" ||
      rec.status === "succeeded" ||
      rec.status === "regressed") &&
    (rec.baseline_metrics || rec.outcome_metrics);

  return (
    <Card className={`overflow-hidden ${statusBorder}`}>
      <CardContent className="pt-4 space-y-4">
        {/* Header: priority + category + subcategory */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={priorityProps.variant}
            className={priorityProps.className}
          >
            {rec.priority.toUpperCase()}
          </Badge>
          <Badge variant="outline">{rec.category}</Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {rec.subcategory}
          </Badge>

          {rec.status === "reverted" && (
            <Badge variant="secondary" className="ml-auto line-through opacity-70">
              reverted
            </Badge>
          )}
        </div>

        {/* Page + Doctrine */}
        {(rec.page_url || rec.doctrine_rule) && (
          <div className="space-y-0.5">
            {rec.page_url && (
              <p className="text-sm font-mono text-muted-foreground">
                {rec.page_url}
              </p>
            )}
            {rec.doctrine_rule && (
              <p className="text-xs text-muted-foreground">
                Doctrine:{" "}
                <span className="font-medium text-foreground">
                  {rec.doctrine_rule}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Current → Proposed */}
        {(rec.current_value || rec.proposed_value) && (
          <div className="space-y-2">
            {rec.current_value && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Current
                </p>
                <div className="bg-muted rounded-md px-3 py-2 text-sm font-mono">
                  {rec.current_value}
                </div>
              </div>
            )}

            {rec.current_value && rec.proposed_value && (
              <div className="flex justify-center">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {rec.proposed_value && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Proposed
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-sm font-mono">
                  {rec.proposed_value}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Reasoning */}
        {rec.ai_reasoning && (
          <div className="flex items-start gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Reasoning: </span>
              {rec.ai_reasoning}
            </p>
          </div>
        )}

        {/* Monitoring metrics: baseline vs outcome */}
        {showMonitoringMetrics && (
          <>
            <Separator />
            <div className="flex gap-3">
              {rec.baseline_metrics && (
                <MetricsGrid label="Baseline" metrics={rec.baseline_metrics} />
              )}
              {rec.outcome_metrics && (
                <MetricsGrid label="Current" metrics={rec.outcome_metrics} />
              )}
            </div>
          </>
        )}

        {/* Action buttons */}
        {rec.status === "pending" && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={isUpdating}
                onClick={() => onStatusChange(rec.id, "approved")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                disabled={isUpdating}
                onClick={() => onStatusChange(rec.id, "rejected")}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            </div>
          </>
        )}

        {rec.status === "approved" && (
          <>
            <Separator />
            <Button
              size="sm"
              className="w-full"
              disabled={isUpdating}
              onClick={() => onStatusChange(rec.id, "applied")}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Mark Applied
            </Button>
          </>
        )}

        {rec.status === "applied" && (
          <>
            <Separator />
            <Button size="sm" variant="outline" className="w-full" disabled>
              <Clock className="h-4 w-4 mr-1.5 animate-pulse" />
              Monitoring...
            </Button>
          </>
        )}

        {rec.status === "succeeded" && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Succeeded</span>
              {rec.applied_at && (
                <span className="text-muted-foreground ml-auto text-xs">
                  Applied {formatDistanceToNow(new Date(rec.applied_at))} ago
                </span>
              )}
            </div>
          </>
        )}

        {rec.status === "regressed" && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Regressed</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                disabled={isUpdating}
                onClick={() => onStatusChange(rec.id, "reverted")}
              >
                Revert
              </Button>
            </div>
          </>
        )}

        {/* Timestamp footer */}
        <p className="text-xs text-muted-foreground">
          Created {format(new Date(rec.created_at), "MMM d, yyyy")}
          {rec.applied_at &&
            rec.status !== "succeeded" &&
            rec.status !== "regressed" && (
              <> · Applied {format(new Date(rec.applied_at), "MMM d, yyyy")}</>
            )}
        </p>
      </CardContent>
    </Card>
  );
}
