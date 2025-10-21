import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { LaunchPadStage } from "@/lib/launchpadTypes";

interface OnboardingProgressProps {
  currentStage: LaunchPadStage;
  completeness: {
    discovery: number;
    marketing: number;
    avatar: number;
  };
  completedAt?: Record<string, string>;
}

const stages = [
  { id: 'discovery', label: 'Discovery' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'avatar', label: 'Avatar' },
] as const;

export function OnboardingProgress({ currentStage, completeness, completedAt = {} }: OnboardingProgressProps) {
  const getStageStatus = (stageId: string) => {
    // Check if stage has been marked complete
    if (completedAt[stageId]) return 'complete';
    
    // Check if stage has any progress
    const progress = completeness[stageId as keyof typeof completeness] || 0;
    if (progress > 0) return 'active';
    
    return 'pending';
  };

  const getStageIcon = (stageId: string) => {
    const status = getStageStatus(stageId);
    if (status === 'complete') return <CheckCircle2 className="h-5 w-5 text-[#13cf48]" />;
    if (status === 'active') return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Launchpad Progress</h3>
        
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.id);
            const progress = completeness[stage.id as keyof typeof completeness] || 0;
            
            return (
              <div key={stage.id}>
                <div className="flex items-center gap-3 mb-2">
                  {getStageIcon(stage.id)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${status === 'pending' ? 'text-muted-foreground' : ''}`}>
                        {stage.label}
                      </span>
                      {status === 'complete' ? (
                        <Badge variant="outline" className="text-xs bg-[#13cf48]/10 text-[#13cf48] border-[#13cf48]/20">
                          Complete
                        </Badge>
                      ) : (status === 'active' || progress > 0) ? (
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      ) : null}
                    </div>
                    {(status === 'active' || status === 'complete' || progress > 0) && (
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: status === 'complete' ? '100%' : `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {index < stages.length - 1 && (
                  <div className={`ml-2.5 h-6 w-0.5 ${status === 'complete' ? 'bg-[#13cf48]' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
