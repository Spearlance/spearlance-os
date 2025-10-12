import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={() => navigate("/")}
          className="bg-[#13cf48] hover:bg-[#10b93d] text-white"
        >
          Go to Client Home
        </Button>
        
        <Button
          variant="outline"
          onClick={() => navigate("/avatar")}
        >
          View Full Avatar
        </Button>

        {calConnected && (
          <Button
            variant="outline"
            onClick={() => {
              // Open booking dialog or navigate to meetings page
              navigate("/meetings");
            }}
          >
            Book Onboarding Review Call
          </Button>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>You can return to the Launch Pad anytime to view your results.</p>
      </div>
    </div>
  );
}
