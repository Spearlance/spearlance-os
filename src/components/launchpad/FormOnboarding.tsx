import { StageDiscovery } from "./StageDiscovery";
import { StageMarketing } from "./StageMarketing";
import { StageAvatar } from "./StageAvatar";
import { LaunchPadStage, LaunchPadSubmission } from "@/lib/launchpadTypes";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
  const isStageAccessible = (stageId: LaunchPadStage) => {
    if (stageId === 'discovery') return true;
    if (stageId === 'marketing') return (submission.discovery_completeness || 0) > 0;
    if (stageId === 'avatar') return (submission.marketing_completeness || 0) > 0;
    return false;
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
