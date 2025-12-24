import { Check, AlertTriangle, Loader2 } from "lucide-react";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SaveStatusIndicator() {
  const { status, errorMessage, clearError } = useSaveStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-all duration-300",
              status === 'idle' && "text-muted-foreground/50",
              status === 'saving' && "text-muted-foreground",
              status === 'saved' && "text-green-600 dark:text-green-400",
              status === 'error' && "text-destructive cursor-pointer hover:bg-destructive/10"
            )}
            onClick={status === 'error' ? clearError : undefined}
          >
            {status === 'idle' && (
              <Check className="h-4 w-4" />
            )}
            {status === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            )}
            {status === 'saved' && (
              <>
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Saved</span>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Error</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {status === 'idle' && "All changes saved"}
          {status === 'saving' && "Saving changes..."}
          {status === 'saved' && "All changes saved"}
          {status === 'error' && (errorMessage || "Failed to save. Click to dismiss.")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
