import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import { Loader2, Sparkles, Image as ImageIcon } from "lucide-react";

interface StageAvatarProps {
  submissionId: string;
  onFinish: () => void;
  onBack: () => void;
  onSaveExit: () => void;
}

export function StageAvatar({ submissionId, onFinish, onBack, onSaveExit }: StageAvatarProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  // Editable fields
  const [avatarName, setAvatarName] = useState("New Persona");
  const [demographics, setDemographics] = useState("");
  const [firmographics, setFirmographics] = useState("");
  const [goals, setGoals] = useState("");
  const [pains, setPains] = useState("");
  const [objections, setObjections] = useState("");
  const [motivators, setMotivators] = useState("");
  const [tone, setTone] = useState("");
  const [channels, setChannels] = useState("");
  const [keywords, setKeywords] = useState("");

  // AI Output
  const [aiSummary, setAiSummary] = useState("");
  const [adHooks, setAdHooks] = useState<string[]>([]);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const [idealClientStory, setIdealClientStory] = useState("");

  useEffect(() => {
    loadExistingData();
  }, [selectedClient]);

  const loadExistingData = async () => {
    if (!selectedClient) return;

    // Check if avatar exists
    const { data: avatar } = await supabase
      .from("avatars")
      .select("*")
      .eq("client_id", selectedClient.id)
      .maybeSingle();

    if (avatar) {
      setHasAnalyzed(true);
      setAvatarName(avatar.avatar_name || "New Persona");
      setDemographics(avatar.demographics || "");
      setFirmographics(avatar.firmographics || "");
      setGoals(avatar.goals || "");
      setPains(avatar.pains || "");
      setObjections(avatar.objections || "");
      setMotivators(avatar.motivators || "");
      setTone(avatar.tone_voice || "");
      setAiSummary(avatar.ai_summary || "");
      setAdHooks(avatar.ad_hooks || []);
      setChannels(avatar.channels?.join(", ") || "");
      setKeywords(avatar.keywords?.join(", ") || "");
      setAvatarImageUrl(avatar.generated_image_url || null);
    }

    // Load submission data
    const { data: submission } = await supabase
      .from("launchpad_submissions")
      .select("ideal_client_story, avatar_image_url")
      .eq("id", submissionId)
      .single();

    if (submission) {
      setIdealClientStory(submission.ideal_client_story || "");
      if (submission.avatar_image_url) setAvatarImageUrl(submission.avatar_image_url);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedClient) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("launchpad-analyze", {
        body: { client_id: selectedClient.id },
      });

      if (error) throw error;

      toast({ title: "Analysis complete!", className: "bg-[#13cf48] text-white" });
      
      // Reload data
      await loadExistingData();
      setHasAnalyzed(true);

      // Mark stage complete
      const { data: submissionData } = await supabase
        .from("launchpad_submissions")
        .select("completed_at")
        .eq("id", submissionId)
        .single();

      await supabase
        .from("launchpad_submissions")
        .update({
          stage: "complete",
          completed_at: { ...((submissionData?.completed_at as Record<string, any>) || {}), avatar: new Date().toISOString() } as any,
        })
        .eq("id", submissionId);

    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Error running analysis",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedClient) return;

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("avatar-generate-image", {
        body: { client_id: selectedClient.id },
      });

      if (error) throw error;

      if (data?.image_url) {
        setAvatarImageUrl(data.image_url);
        toast({ title: "Avatar image generated!", className: "bg-[#13cf48] text-white" });
      }
    } catch (error: any) {
      console.error("Image generation error:", error);
      toast({
        title: "Error generating image",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from("avatars")
        .update({
          avatar_name: avatarName,
          channels: channels.split(",").map((c) => c.trim()).filter(Boolean),
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          updated_at: new Date().toISOString(),
        })
        .eq("client_id", selectedClient.id);

      if (error) throw error;

      toast({ title: "Edits saved" });
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Error saving edits", variant: "destructive" });
    }
  };

  const canFinish = hasAnalyzed && avatarName.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Avatar Stage</h2>
            <p className="text-sm text-muted-foreground">
              Run AI analysis to generate your customer avatar and marketing insights based on your business data.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Editable Fields */}
          <div className="space-y-6 bg-card p-6 rounded-lg border">
            <div>
              <h3 className="font-semibold mb-4">Avatar Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="avatar_name">Avatar Name *</Label>
                  <Input
                    id="avatar_name"
                    value={avatarName}
                    onChange={(e) => setAvatarName(e.target.value)}
                    placeholder="New Persona"
                  />
                </div>

                <div>
                  <Label htmlFor="demographics">Demographics</Label>
                  <Textarea
                    id="demographics"
                    rows={2}
                    value={demographics}
                    onChange={(e) => setDemographics(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="firmographics">Firmographics</Label>
                  <Textarea
                    id="firmographics"
                    rows={2}
                    value={firmographics}
                    onChange={(e) => setFirmographics(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="goals">Goals</Label>
                  <Textarea
                    id="goals"
                    rows={2}
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="pains">Pains</Label>
                  <Textarea
                    id="pains"
                    rows={2}
                    value={pains}
                    onChange={(e) => setPains(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="objections">Objections</Label>
                  <Textarea
                    id="objections"
                    rows={2}
                    value={objections}
                    onChange={(e) => setObjections(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="motivators">Motivators</Label>
                  <Textarea
                    id="motivators"
                    rows={2}
                    value={motivators}
                    onChange={(e) => setMotivators(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="tone">Tone & Voice</Label>
                  <Textarea
                    id="tone"
                    rows={2}
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="channels">Channels (comma-separated)</Label>
                  <Input
                    id="channels"
                    value={channels}
                    onChange={(e) => setChannels(e.target.value)}
                    placeholder="Google Ads, Facebook, LinkedIn"
                  />
                </div>

                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="plumber, emergency, 24/7"
                  />
                </div>

                <div>
                  <Label>Service Areas</Label>
                  <Input
                    placeholder="Add service area (comma-separated)"
                    defaultValue=""
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        // This would need state management - simplified for now
                      }
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="pricing_model">Pricing Model</Label>
                  <Input
                    id="pricing_model"
                    placeholder="e.g., Hourly, Project-based, Monthly retainer"
                  />
                </div>

                <div>
                  <Label htmlFor="price_range">Price Range</Label>
                  <Input
                    id="price_range"
                    placeholder="e.g., $500-$1000 or Starting at $1500"
                  />
                </div>

                <Button onClick={handleSaveEdits} variant="outline" className="w-full">
                  Save Edits
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - AI Output */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">AI Insights</h3>
                    {hasAnalyzed && <Badge className="bg-[#13cf48]">Analyzed</Badge>}
                  </div>

                  {!hasAnalyzed ? (
                    <div className="text-center py-8">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Run analysis to generate your customer avatar and marketing insights
                      </p>
                      <Button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className="bg-[#13cf48] hover:bg-[#10b93d] text-white"
                      >
                        {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Run Analysis
                      </Button>
                    </div>
                  ) : (
                    <>
                      {avatarImageUrl && (
                        <div className="rounded-lg overflow-hidden border">
                          <img
                            src={avatarImageUrl}
                            alt="Customer Avatar"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}

                      {!avatarImageUrl && (
                        <Button
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage}
                          variant="outline"
                          className="w-full"
                        >
                          {isGeneratingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Generate Avatar Image
                        </Button>
                      )}

                      {aiSummary && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Summary</h4>
                          <p className="text-sm text-muted-foreground">{aiSummary}</p>
                        </div>
                      )}

                      {adHooks && adHooks.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Top Ad Hooks</h4>
                          <div className="flex flex-wrap gap-2">
                            {adHooks.slice(0, 5).map((hook, index) => (
                              <Badge key={index} variant="secondary">
                                {hook}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {idealClientStory && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Ideal Client Story</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {idealClientStory.split("\n").slice(0, 4).join("\n")}
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        variant="outline"
                        className="w-full"
                      >
                        {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Re-run Analysis
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button variant="outline" onClick={onSaveExit}>
            Save & Exit
          </Button>
        </div>
        {canFinish && (
          <Button
            onClick={onFinish}
            className="bg-[#13cf48] hover:bg-[#10b93d] text-white"
          >
            Finish
          </Button>
        )}
      </div>
    </div>
  );
}
