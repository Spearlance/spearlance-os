import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stages = [
  { id: "discovery", label: "Discovery", description: "Tell us about your business" },
  { id: "access", label: "Access", description: "Connect your marketing accounts" },
  { id: "assets", label: "Assets", description: "Upload your brand materials" },
  { id: "avatar", label: "Avatar", description: "Generate your customer avatar" },
  { id: "complete", label: "Complete", description: "You're all set!" },
];

export default function LaunchPad() {
  const { selectedClient } = useClient();
  const [submission, setSubmission] = useState<any>(null);
  const [currentStage, setCurrentStage] = useState("discovery");
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      loadSubmission();
    }
  }, [selectedClient]);

  const loadSubmission = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("launchpad_submissions")
      .select("*")
      .eq("client_id", selectedClient.id)
      .maybeSingle();

    if (error) {
      toast({ title: "Error loading Launch Pad", variant: "destructive" });
      return;
    }

    if (data) {
      setSubmission(data);
      setCurrentStage(data.stage as string);
    } else {
      // Create new submission
      const { data: newSubmission } = await supabase
        .from("launchpad_submissions")
        .insert({
          client_id: selectedClient.id,
          stage: "discovery",
        })
        .select()
        .single();

      setSubmission(newSubmission);
    }
  };

  const handleStageComplete = async (nextStage: any) => {
    if (!submission) return;

    const { error } = await supabase
      .from("launchpad_submissions")
      .update({ stage: nextStage })
      .eq("id", submission.id);

    if (error) {
      toast({ title: "Error updating stage", variant: "destructive" });
      return;
    }

    setCurrentStage(nextStage);
    toast({ title: "Stage completed!" });
  };

  const getStageStatus = (stageId: string) => {
    const stageIndex = stages.findIndex((s) => s.id === stageId);
    const currentIndex = stages.findIndex((s) => s.id === currentStage);

    if (stageIndex < currentIndex) return "complete";
    if (stageIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Launch Pad</h1>
        <p className="text-muted-foreground">
          Complete these steps to get your marketing operation set up
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.id);
          return (
            <div key={stage.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors ${
                    status === "complete"
                      ? "bg-primary border-primary text-primary-foreground"
                      : status === "current"
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {status === "complete" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">{stage.label}</p>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </div>
              </div>
              {index < stages.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 transition-colors ${
                    status === "complete" ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {stages.find((s) => s.id === currentStage)?.label} Stage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStage === "discovery" && (
            <div className="space-y-4">
              <p>Tell us about your business, target market, and marketing goals.</p>
              <Button onClick={() => handleStageComplete("access")}>
                Complete Discovery
              </Button>
            </div>
          )}

          {currentStage === "access" && (
            <div className="space-y-4">
              <p>Connect your ad accounts, analytics, and marketing platforms.</p>
              <Button onClick={() => handleStageComplete("assets")}>
                Complete Access
              </Button>
            </div>
          )}

          {currentStage === "assets" && (
            <div className="space-y-4">
              <p>Upload your brand materials, logos, and marketing assets.</p>
              <Button onClick={() => handleStageComplete("avatar")}>
                Complete Assets
              </Button>
            </div>
          )}

          {currentStage === "avatar" && (
            <div className="space-y-4">
              <p>
                Run AI analysis to generate your customer avatar and marketing insights.
              </p>
              <Button onClick={() => handleStageComplete("complete")}>
                Run Analysis
              </Button>
            </div>
          )}

          {currentStage === "complete" && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">All Set!</h2>
                <p className="text-muted-foreground mb-6">
                  Your marketing operation is ready to go.
                </p>
                <Badge variant="default" className="text-lg px-4 py-2">
                  Launch Pad Complete
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
