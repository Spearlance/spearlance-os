import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LaunchPadStage, LaunchPadSubmission } from "@/lib/launchpadTypes";
import { ProgressHeader } from "./ProgressHeader";
import { LaunchPadModeSelector } from "./LaunchPadModeSelector";
import { ChatOnboarding } from "./ChatOnboarding";
import { FormOnboarding } from "./FormOnboarding";
import { SuccessScreen } from "./SuccessScreen";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";

export function LaunchPadWizard() {
  const { selectedClient, loading: clientLoading } = useClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<LaunchPadSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModeSelector, setShowModeSelector] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadOrCreateSubmission();
    }
  }, [selectedClient]);

  const loadOrCreateSubmission = async () => {
    if (!selectedClient) {
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("launchpad_submissions")
        .select("*")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSubmission({
          ...data,
          completed_at: data.completed_at || {}
        } as LaunchPadSubmission);
        
        // Check if they've already started (has onboarding_mode OR has progressed past discovery)
        const hasStarted = data.onboarding_mode || data.stage !== 'discovery';
        const completedAt = data.completed_at as Record<string, any> || {};
        
        if (!hasStarted && !completedAt.welcome) {
          // Brand new submission - show welcome screen
          setShowModeSelector(true);
        } else if (hasStarted && !data.onboarding_mode) {
          // Started but no mode selected (edge case) - show mode selector
          setShowModeSelector(true);
        } else if (hasStarted && !completedAt.welcome) {
          // Has mode and started but missing welcome timestamp - backfill it
          await supabase
            .from('launchpad_submissions')
            .update({
              completed_at: { ...completedAt, welcome: new Date().toISOString() } as any
            })
            .eq('id', data.id);
        }
        // Otherwise, showModeSelector stays false and they continue where they left off
      } else {
        // Show welcome screen for new submissions
        setShowModeSelector(true);
      }
    } catch (error) {
      toast({ title: "Error loading Launchpad", variant: "destructive" });
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
      toast({ title: "Error completing Launchpad", variant: "destructive" });
    }
  };

  const handleModeSelect = async (mode: 'chat' | 'form') => {
    if (!selectedClient) return;

    try {
      // Create or update submission with selected mode and welcome completion
      if (submission) {
        const completedAt = (submission.completed_at as Record<string, any>) || {};
        await supabase
          .from("launchpad_submissions")
          .update({ 
            onboarding_mode: mode,
            completed_at: { ...completedAt, welcome: new Date().toISOString() } as any,
          })
          .eq("id", submission.id);
        
        setSubmission({ 
          ...submission, 
          onboarding_mode: mode,
          completed_at: { ...completedAt, welcome: new Date().toISOString() } as any,
        } as any);
      } else {
        const { data: newSubmission, error } = await supabase
          .from("launchpad_submissions")
          .insert({
            client_id: selectedClient.id,
            stage: "discovery",
            responses_json: {},
            completed_at: { welcome: new Date().toISOString() } as any,
            onboarding_mode: mode,
          })
          .select()
          .single();

        if (error) throw error;

        setSubmission({
          ...newSubmission,
          completed_at: newSubmission.completed_at || {}
        } as LaunchPadSubmission);
      }

      setShowModeSelector(false);
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSwitchMode = async (newMode: 'chat' | 'form') => {
    if (!submission) return;

    try {
      await supabase
        .from("launchpad_submissions")
        .update({ onboarding_mode: newMode })
        .eq("id", submission.id);

      setSubmission({ ...submission, onboarding_mode: newMode } as any);

      toast({
        title: `Switched to ${newMode === 'chat' ? 'Chat' : 'Form'} mode`,
        description: "Your progress has been saved.",
      });
    } catch (error) {
      toast({ title: "Error switching mode", variant: "destructive" });
    }
  };

  if (clientLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No client selected</p>
      </div>
    );
  }

  // Show mode selector if needed
  if (showModeSelector) {
    // Calculate progress if submission exists
    let progress = 0;
    if (submission) {
      const completedAt = (submission.completed_at as Record<string, any>) || {};
      if (completedAt.discovery) progress += 33;
      if (completedAt.marketing) progress += 33;
      if (completedAt.avatar) progress += 34;
    }
    
    return <LaunchPadModeSelector onSelectMode={handleModeSelect} currentProgress={progress} />;
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Unable to load Launchpad</p>
      </div>
    );
  }

  // Show success screen if complete
  if (submission.stage === "complete") {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <SuccessScreen />
        </div>
      </div>
    );
  }

  // Show chat or form mode based on selection
  const isChatMode = (submission as any).onboarding_mode === 'chat';

  return (
    <div className="min-h-screen">
      {!isChatMode && (
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

      <div className={isChatMode ? "" : "container mx-auto px-4 py-8"}>
        {isChatMode ? (
          <ChatOnboarding
            submission={submission}
            onSwitchToForm={() => handleSwitchMode('form')}
          />
        ) : (
          <FormOnboarding
            submission={submission}
            onStageChange={handleStageChange}
            onSaveExit={handleSaveExit}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
}
