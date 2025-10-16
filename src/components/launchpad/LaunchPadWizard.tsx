import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LaunchPadStage, LaunchPadSubmission } from "@/lib/launchpadTypes";
import { ProgressHeader } from "./ProgressHeader";
import { StageDiscovery } from "./StageDiscovery";
import { StageMarketing } from "./StageMarketing";
import { StageAssets } from "./StageAssets";
import { StageAvatar } from "./StageAvatar";
import { SuccessScreen } from "./SuccessScreen";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";

export function LaunchPadWizard() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<LaunchPadSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedClient) {
      loadOrCreateSubmission();
    }
  }, [selectedClient]);

  const loadOrCreateSubmission = async () => {
    if (!selectedClient) {
      console.log('[LaunchPad] No client selected');
      return;
    }

    console.log('[LaunchPad] Loading submission for client:', selectedClient.id);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("launchpad_submissions")
        .select("*")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        console.log('[LaunchPad] Found existing submission:', { id: data.id, stage: data.stage, completed_at: data.completed_at });
        setSubmission({
          ...data,
          completed_at: data.completed_at || {}
        } as LaunchPadSubmission);
      } else {
        console.log('[LaunchPad] No submission found, creating new one');
        // Create new submission
        const { data: newSubmission, error: createError } = await supabase
          .from("launchpad_submissions")
          .insert({
            client_id: selectedClient.id,
            stage: "discovery",
            responses_json: {},
            completed_at: {},
          })
          .select()
          .single();

        if (createError) throw createError;

        console.log('[LaunchPad] Created new submission:', newSubmission.id);
        setSubmission({
          ...newSubmission,
          completed_at: newSubmission.completed_at || {}
        } as LaunchPadSubmission);
      }
    } catch (error) {
      console.error("[LaunchPad] Error loading submission:", error);
      toast({ title: "Error loading Launch Pad", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage: LaunchPadStage) => {
    if (!submission) return;

    try {
      // Update database with new stage
      const { error } = await supabase
        .from("launchpad_submissions")
        .update({ stage: newStage as any })
        .eq("id", submission.id);

      if (error) throw error;

      // Update local state
      setSubmission({ ...submission, stage: newStage });

      // Reload to get fresh data
      loadOrCreateSubmission();
    } catch (error) {
      console.error("Error changing stage:", error);
      toast({
        title: "Error changing stage",
        variant: "destructive",
      });
    }
  };

  const handleSaveExit = () => {
    toast({ title: "Progress saved" });
    navigate("/");
  };

  const handleFinish = async () => {
    if (!submission) return;

    try {
      // Get current completed_at
      const { data: submissionData } = await supabase
        .from("launchpad_submissions")
        .select("completed_at")
        .eq("id", submission.id)
        .single();

      await supabase
        .from("launchpad_submissions")
        .update({
          stage: "complete",
          completed_at: { ...((submissionData?.completed_at as Record<string, any>) || {}), complete: new Date().toISOString() } as any,
        })
        .eq("id", submission.id);

      handleStageChange("complete");
    } catch (error) {
      console.error("Finish error:", error);
      toast({ title: "Error completing Launch Pad", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No client selected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {submission.stage !== "complete" && (
        <>
          <ProgressHeader
            currentStage={submission.stage}
            completedAt={submission.completed_at as Record<string, string>}
            onStageClick={handleStageChange}
          />
          
          <div className="container mx-auto px-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  Fill out this information to the best of your ability. This is what our AI will use to help you with your marketing campaigns.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="container mx-auto px-4 py-8">
        {submission.stage === "discovery" && (
          <StageDiscovery
            submissionId={submission.id}
            initialData={submission.responses_json?.discovery}
            onContinue={() => handleStageChange("marketing")}
            onSaveExit={handleSaveExit}
          />
        )}

        {submission.stage === "marketing" && (
          <StageMarketing
            submissionId={submission.id}
            onContinue={() => handleStageChange("assets")}
            onBack={() => handleStageChange("discovery")}
            onSaveExit={handleSaveExit}
          />
        )}

        {submission.stage === "assets" && (
          <StageAssets
            submissionId={submission.id}
            onContinue={() => handleStageChange("avatar")}
            onBack={() => handleStageChange("marketing")}
            onSaveExit={handleSaveExit}
          />
        )}

        {submission.stage === "avatar" && (
          <StageAvatar
            submissionId={submission.id}
            onFinish={handleFinish}
            onBack={() => handleStageChange("assets")}
            onSaveExit={handleSaveExit}
          />
        )}

        {submission.stage === "complete" && <SuccessScreen />}
      </div>
    </div>
  );
}
