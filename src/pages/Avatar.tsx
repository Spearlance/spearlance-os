import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Image as ImageIcon, RotateCw, Copy, Download, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Avatar() {
  const { selectedClient } = useClient();
  const [avatar, setAvatar] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
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

      toast({ 
        title: "AI Summary Generated",
        description: "Your 250-400 word customer narrative is ready."
      });
      loadAvatar();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate AI summary",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = async () => {
    if (!avatar?.ai_summary) return;
    
    try {
      await navigator.clipboard.writeText(avatar.ai_summary);
      toast({
        title: "Copied!",
        description: "AI summary copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateImage = async () => {
    if (!avatar?.ai_summary) {
      toast({
        title: "Generate AI Summary First",
        description: "You need an AI summary before generating avatar images.",
        variant: "destructive",
      });
      return;
    }

    setLoadingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("avatar-generate-image", {
        body: { client_id: selectedClient?.id },
      });

      if (error) throw error;

      toast({ 
        title: "Avatar Images Generated",
        description: "3 customer avatar portraits have been created successfully."
      });
      loadAvatar();
    } catch (error: any) {
      toast({ 
        title: "Error",
        description: error.message || "Failed to generate avatar images",
        variant: "destructive" 
      });
    } finally {
      setLoadingImage(false);
    }
  };

  const handleSetPrimaryImage = async (imageUrl: string) => {
    if (!avatar) return;

    try {
      const { error } = await supabase
        .from('avatars')
        .update({ primary_image_url: imageUrl })
        .eq('id', avatar.id);

      if (error) throw error;

      setAvatar({ ...avatar, primary_image_url: imageUrl });
      toast({
        title: "Primary Image Set",
        description: "This image is now your primary avatar.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to set primary image",
        variant: "destructive",
      });
    }
  };

  const handleDownloadImage = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `avatar-image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasFormData = avatar?.demographics || avatar?.firmographics || avatar?.goals;

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

              <div className="space-y-2">
                <Label>Service Areas</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add service area (press Enter)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        const newArea = e.currentTarget.value.trim();
                        setAvatar({
                          ...avatar,
                          service_areas: [...(avatar.service_areas || []), newArea]
                        });
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {avatar.service_areas?.map((area: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {area}
                      <button
                        type="button"
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setAvatar({
                            ...avatar,
                            service_areas: avatar.service_areas?.filter((_: string, idx: number) => idx !== i)
                          });
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pricing Model</Label>
                <Input
                  value={avatar.pricing_model || ""}
                  onChange={(e) => setAvatar({ ...avatar, pricing_model: e.target.value })}
                  placeholder="e.g., Hourly, Project-based, Monthly retainer"
                />
              </div>

              <div className="space-y-2">
                <Label>Price Range</Label>
                <Input
                  value={avatar.price_range || ""}
                  onChange={(e) => setAvatar({ ...avatar, price_range: e.target.value })}
                  placeholder="e.g., $500-$1000 or Starting at $1500"
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
          {/* AI Summary Section */}
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold">AI Summary</CardTitle>
                <p className="text-sm text-muted-foreground">
                  See how your target audience comes to life based on your inputs.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateSummary} 
                disabled={loading || !hasFormData} 
                className="w-full bg-[#13cf48] hover:bg-[#13cf48]/90 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {loading ? "Generating..." : "Generate AI Summary"}
              </Button>

              {avatar.ai_summary && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {avatar.ai_summary_generated_at && (
                      <p className="text-xs text-muted-foreground">
                        Last generated: {format(new Date(avatar.ai_summary_generated_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateSummary}
                      disabled={loading}
                      title="Regenerate summary"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="bg-[#0b0b0d] text-white p-4 rounded-lg max-h-96 overflow-y-auto">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{avatar.ai_summary}</p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopySummary}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Summary
                  </Button>
                </div>
              )}

              {!avatar.ai_summary && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Click Generate to create an AI-powered 250-400 word narrative of your ideal customer.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ad Hooks Section */}
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

          {/* Avatar Image Section */}
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold">Avatar Image</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Visualize your target customer. Based on the AI Summary.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGenerateImage}
                disabled={loadingImage || !avatar.ai_summary}
                className="w-full bg-[#13cf48] hover:bg-[#13cf48]/90 text-white"
                title={!avatar.ai_summary ? "Generate an AI summary first" : ""}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {loadingImage ? "Generating..." : "Generate Avatar Image"}
              </Button>

              {avatar.generated_image_urls && avatar.generated_image_urls.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {avatar.generated_image_urls.map((imageUrl: string, index: number) => {
                      const isPrimary = imageUrl === avatar.primary_image_url;
                      return (
                        <div
                          key={index}
                          className={`group relative aspect-square rounded-lg overflow-hidden transition-all ${
                            isPrimary ? "ring-2 ring-[#13cf48]" : ""
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`Avatar ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          
                          {isPrimary && (
                            <div className="absolute top-2 right-2 bg-[#13cf48] rounded-full p-1">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-full text-xs"
                              onClick={() => handleDownloadImage(imageUrl, index)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            {!isPrimary && (
                              <Button
                                size="sm"
                                className="w-full text-xs bg-[#13cf48] hover:bg-[#13cf48]/90 text-white"
                                onClick={() => handleSetPrimaryImage(imageUrl)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Set Primary
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImage}
                    disabled={loadingImage}
                    className="w-full"
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Regenerate Images
                  </Button>
                </div>
              ) : (
                <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center p-8 text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-1">No images generated yet</p>
                  <p className="text-xs text-muted-foreground">
                    Generate an AI summary first, then create avatar images
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
