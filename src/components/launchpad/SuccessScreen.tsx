import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Palette, Sparkles, Home, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";

export function SuccessScreen() {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [avatarData, setAvatarData] = useState<any>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [calConnected, setCalConnected] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedClient]);

  const loadData = async () => {
    if (!selectedClient) return;

    // Load avatar
    const { data: avatar } = await supabase
      .from("avatars")
      .select("*")
      .eq("client_id", selectedClient.id)
      .maybeSingle();

    if (avatar) setAvatarData(avatar);

    // Load submission
    const { data: submission } = await supabase
      .from("launchpad_submissions")
      .select("*")
      .eq("client_id", selectedClient.id)
      .single();

    if (submission) setSubmissionData(submission);

    // Check if Cal.com is connected
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("cal_connected")
        .eq("id", user.id)
        .single();

      setCalConnected(profile?.cal_connected || false);
    }
  };

  const avatarImageUrl = avatarData?.generated_image_url || submissionData?.avatar_image_url;
  const adHooks = avatarData?.ad_hooks || [];
  const idealClientStory = submissionData?.ideal_client_story || "";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center py-8">
        <CheckCircle2 className="h-20 w-20 text-[#13cf48] mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">All Set!</h1>
        <p className="text-muted-foreground mb-4">
          Your marketing operation is ready to go.
        </p>
        <Badge className="text-lg px-6 py-2 bg-[#13cf48] hover:bg-[#10b93d]">
          Launch Pad Complete
        </Badge>
      </div>

      {/* Avatar Card */}
      {avatarData && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {avatarImageUrl && (
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={avatarImageUrl}
                    alt="Customer Avatar"
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {avatarData.avatar_name || "Your Customer Avatar"}
                  </h2>
                  {avatarData.ai_summary && (
                    <p className="text-sm text-muted-foreground">
                      {avatarData.ai_summary}
                    </p>
                  )}
                </div>

                {adHooks.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">Top Ad Hooks</h3>
                    <div className="flex flex-wrap gap-2">
                      {adHooks.slice(0, 3).map((hook: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {hook}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {idealClientStory && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">Ideal Client Story</h3>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {idealClientStory}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4 text-center">What's Next?</h2>
          <div className="space-y-3">
            <div className="bg-background/60 backdrop-blur rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Set Your Brand Identity</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Define your colors, fonts, and visual style. This helps our AI create better marketing materials for you.
                  </p>
                  <Button className="w-full" onClick={() => navigate("/brand-guide")}>
                    <Palette className="mr-2 h-4 w-4" />
                    Go to Brand Guide
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-background/60 backdrop-blur rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Create Your First Post</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Once your brand is set, start creating engaging social media content powered by your avatar.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/social-media")}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Go to Social Media
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
        >
          <Home className="mr-2 h-4 w-4" />
          Go to Client Home
        </Button>
        
        {avatarData && (
          <Button
            variant="outline"
            onClick={() => navigate("/avatar")}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Full Avatar
          </Button>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>💡 Tip: Setting your brand identity first ensures all your marketing materials are on-brand!</p>
      </div>
    </div>
  );
}
