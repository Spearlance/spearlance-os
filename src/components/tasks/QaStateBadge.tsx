import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QA_STATE_CLASSES, isQaState, qaStateLabel } from "@/lib/taskQa";

interface QaStateBadgeProps {
  qaState: string | null | undefined;
  className?: string;
}

/** Small pill showing where a task is in the QA pipeline. Renders nothing when not in QA. */
export function QaStateBadge({ qaState, className }: QaStateBadgeProps) {
  if (!qaState) return null;
  const classes = isQaState(qaState) ? QA_STATE_CLASSES[qaState] : "";
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] uppercase tracking-wide font-medium whitespace-nowrap", classes, className)}
      title={`QA: ${qaStateLabel(qaState)}`}
    >
      {qaStateLabel(qaState)}
    </Badge>
  );
}
