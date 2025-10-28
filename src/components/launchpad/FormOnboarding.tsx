import { StageDiscovery } from "./StageDiscovery";
import { StageMarketing } from "./StageMarketing";
import { StageAvatar } from "./StageAvatar";
import { LaunchPadStage, LaunchPadSubmission } from "@/lib/launchpadTypes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import { ProgressCoach } from "./ProgressCoach";

interface FormOnboardingProps {
  submission: LaunchPadSubmission;
  onStageChange: (stage: LaunchPadStage) => void;
  onSaveExit: () => void;
  onFinish: () => void;
}

export function FormOnboarding({
  submission,
  onStageChange,
  onSaveExit,
  onFinish,
}: FormOnboardingProps) {
  // Calculate completeness for progress coach
  const getCompleteness = () => {
    if (submission.stage === "discovery") return submission.discovery_completeness || 0;
    if (submission.stage === "marketing") return submission.marketing_completeness || 0;
    if (submission.stage === "avatar") return submission.avatar_completeness || 0;
    return 0;
  };

  const getStageLabel = () => {
    if (submission.stage === "discovery") return "Tell Us About Your Business";
    if (submission.stage === "marketing") return "How You Serve Your Customers";
    if (submission.stage === "avatar") return "Meet Your Ideal Customer";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled
          className="cursor-not-allowed opacity-60 gap-2"
        >
          <Bot className="h-4 w-4" />
          Onboard with AI
          <Badge variant="secondary" className="ml-1">Coming Soon</Badge>
        </Button>
      </div>
      
      {submission.stage === "discovery" && (
        <StageDiscovery
          submissionId={submission.id}
          initialData={submission.responses_json?.discovery}
          onContinue={() => onStageChange("marketing")}
          onSaveExit={onSaveExit}
        />
      )}

      {submission.stage === "marketing" && (
        <StageMarketing
          submissionId={submission.id}
          onContinue={() => onStageChange("avatar")}
          onBack={() => onStageChange("discovery")}
          onSaveExit={onSaveExit}
        />
      )}

      {submission.stage === "avatar" && (
        <StageAvatar
          submissionId={submission.id}
          onFinish={onFinish}
          onBack={() => onStageChange("marketing")}
          onSaveExit={onSaveExit}
        />
      )}

      {/* Progress Coach */}
      <ProgressCoach
        stage={submission.stage}
        completeness={getCompleteness()}
        stageLabel={getStageLabel()}
      />
    </div>
  );
}
