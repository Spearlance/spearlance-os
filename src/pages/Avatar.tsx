import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Avatar() {
  const { selectedClient } = useClient();
  const [avatar, setAvatar] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      loadAvatar();
    }
  }, [selectedClient]);

  const loadAvatar = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .eq("client_id", selectedClient.id)
      .maybeSingle();

    if (error) {
      toast({ title: "Error loading avatar", variant: "destructive" });
      return;
    }

    if (data) {
      setAvatar(data);
    } else {
      // Create new avatar
      const { data: newAvatar } = await supabase
        .from("avatars")
        .insert({
          client_id: selectedClient.id,
          avatar_name: `${selectedClient.name} Target Avatar`,
        })
        .select()
        .single();

      setAvatar(newAvatar);
    }
  };

  const handleSave = async () => {
    if (!avatar) return;

    const { error } = await supabase
      .from("avatars")
      .update(avatar)
      .eq("id", avatar.id);

    if (error) {
      toast({ title: "Error saving avatar", variant: "destructive" });
      return;
    }

    toast({ title: "Avatar saved successfully" });
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("avatar-generate-summary", {
        body: { client_id: selectedClient?.id },
      });

      if (error) throw error;

      toast({ title: "AI summary generated successfully" });
      loadAvatar();
    } catch (error) {
      toast({ title: "Error generating summary", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("avatar-generate-image", {
        body: { client_id: selectedClient?.id },
      });

      if (error) throw error;

      toast({ title: "Avatar image generated successfully" });
      loadAvatar();
    } catch (error) {
      toast({ title: "Error generating image", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!avatar) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customer Avatar</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Edit Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Avatar Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Avatar Name</Label>
                <Input
                  value={avatar.avatar_name}
                  onChange={(e) => setAvatar({ ...avatar, avatar_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Demographics</Label>
                <Textarea
                  value={avatar.demographics || ""}
                  onChange={(e) => setAvatar({ ...avatar, demographics: e.target.value })}
                  rows={3}
                  placeholder="Age, gender, location, income, education..."
                />
              </div>

              <div className="space-y-2">
                <Label>Firmographics</Label>
                <Textarea
                  value={avatar.firmographics || ""}
                  onChange={(e) => setAvatar({ ...avatar, firmographics: e.target.value })}
                  rows={3}
                  placeholder="Company size, industry, revenue..."
                />
              </div>

              <div className="space-y-2">
                <Label>Goals</Label>
                <Textarea
                  value={avatar.goals || ""}
                  onChange={(e) => setAvatar({ ...avatar, goals: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Pains</Label>
                <Textarea
                  value={avatar.pains || ""}
                  onChange={(e) => setAvatar({ ...avatar, pains: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Objections</Label>
                <Textarea
                  value={avatar.objections || ""}
                  onChange={(e) => setAvatar({ ...avatar, objections: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Motivators</Label>
                <Textarea
                  value={avatar.motivators || ""}
                  onChange={(e) => setAvatar({ ...avatar, motivators: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tone & Voice</Label>
                <Textarea
                  value={avatar.tone_voice || ""}
                  onChange={(e) => setAvatar({ ...avatar, tone_voice: e.target.value })}
                  rows={3}
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                Save Avatar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: AI Output */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>AI Summary</CardTitle>
              <Button onClick={handleGenerateSummary} disabled={loading} size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </CardHeader>
            <CardContent>
              {avatar.ai_summary ? (
                <p className="text-sm whitespace-pre-wrap">{avatar.ai_summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click Generate to create an AI-powered summary of this avatar.
                </p>
              )}
            </CardContent>
          </Card>

          {avatar.ad_hooks && avatar.ad_hooks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ad Hooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {avatar.ad_hooks.map((hook: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {i + 1}
                      </Badge>
                      <p className="text-sm">{hook}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Avatar Image</CardTitle>
              <Button onClick={handleGenerateImage} disabled={loading} size="sm">
                <ImageIcon className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </CardHeader>
            <CardContent>
              {avatar.generated_image_url ? (
                <img
                  src={avatar.generated_image_url}
                  alt={avatar.avatar_name}
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No image generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
