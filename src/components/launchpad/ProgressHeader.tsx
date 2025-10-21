import { CheckCircle2, Circle } from "lucide-react";
import { LaunchPadStage } from "@/lib/launchpadTypes";

interface ProgressHeaderProps {
  currentStage: LaunchPadStage;
  completedAt: Record<string, string>;
  onStageClick?: (stage: LaunchPadStage) => void;
}

const allStages = [
  { id: "discovery" as LaunchPadStage, label: "Discovery", description: "Business details" },
  { id: "marketing" as LaunchPadStage, label: "Marketing", description: "Service details" },
  { id: "avatar" as LaunchPadStage, label: "Avatar", description: "AI insights" },
];

const stages = allStages.filter(s => !('hidden' in s) || !s.hidden);

export function ProgressHeader({ currentStage, completedAt, onStageClick }: ProgressHeaderProps) {
  const getStageStatus = (stageId: LaunchPadStage) => {
    if (currentStage === "complete") return "complete";
    if (completedAt && completedAt[stageId]) return "complete";
    if (stageId === currentStage) return "current";
    return "upcoming";
  };

  const handleStageClick = (stageId: LaunchPadStage) => {
    if (onStageClick) {
      onStageClick(stageId);
    }
  };

  return (
    <div className="bg-card border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.id);
            return (
              <div key={stage.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <button
                    onClick={() => handleStageClick(stage.id)}
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all cursor-pointer hover:opacity-80 ${
                      status === "complete"
                        ? "bg-[#13cf48] border-[#13cf48] text-white"
                        : status === "current"
                        ? "border-[#13cf48] text-[#13cf48] bg-background"
                        : "border-muted text-muted-foreground bg-background"
                    }`}
                    aria-label={`Navigate to ${stage.label}`}
                    title={`Go to ${stage.label}`}
                  >
                    {status === "complete" ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                  <div className="text-center">
                    <p
                      className={`font-medium text-sm ${
                        status === "current" ? "text-[#13cf48]" : ""
                      }`}
                    >
                      {stage.label}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {stage.description}
                    </p>
                  </div>
                </div>
                {index < stages.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                      status === "complete" ? "bg-[#13cf48]" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
