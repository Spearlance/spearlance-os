import { StageDiscovery } from "./StageDiscovery";
import { StageMarketing } from "./StageMarketing";
import { StageAvatar } from "./StageAvatar";
import { LaunchPadStage, LaunchPadSubmission } from "@/lib/launchpadTypes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

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
    </div>
  );
}
