import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ImageIcon, Copy, Download, Check, Plus, Trash2, CopyPlus, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { CreateAvatarDialog } from "@/components/avatar/CreateAvatarDialog";
import { DuplicateAvatarDialog } from "@/components/avatar/DuplicateAvatarDialog";
import { DeleteAvatarDialog } from "@/components/avatar/DeleteAvatarDialog";
import { AvatarListItem } from "@/components/avatar/AvatarListItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Avatar() {
  const { selectedClient } = useClient();
  const [avatars, setAvatars] = useState<any[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOutOfDate, setIsOutOfDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const selectedAvatar = avatars.find(a => a.id === selectedAvatarId);
  const filteredAvatars = avatars.filter(a => 
    a.avatar_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (selectedClient) {
      loadAvatars();
    }
  }, [selectedClient]);

  const loadAvatars = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .eq("client_id", selectedClient.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading avatars", variant: "destructive" });
      return;
    }

    setAvatars(data || []);
    
    // Auto-select first avatar if none selected
    if (data && data.length > 0 && !selectedAvatarId) {
      setSelectedAvatarId(data[0].id);
    }
  };

  const handleCreateAvatar = async (formData: { avatarName: string; tags: string; note: string }) => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("avatars")
        .insert({
          client_id: selectedClient.id,
          avatar_name: formData.avatarName,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Avatar created successfully" });
      setCreateDialogOpen(false);
      await loadAvatars();
      setSelectedAvatarId(data.id);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create avatar",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateAvatar = async (formData: { avatarName: string; includeAI: boolean; includeImages: boolean }) => {
    if (!selectedAvatar || !selectedClient) return;
    
    setLoading(true);
    try {
      const newAvatar: any = {
        client_id: selectedClient.id,
        avatar_name: formData.avatarName,
        demographics: selectedAvatar.demographics,
        firmographics: selectedAvatar.firmographics,
        goals: selectedAvatar.goals,
        pains: selectedAvatar.pains,
        objections: selectedAvatar.objections,
        motivators: selectedAvatar.motivators,
        tone_voice: selectedAvatar.tone_voice,
        service_areas: selectedAvatar.service_areas,
        pricing_model: selectedAvatar.pricing_model,
        price_range: selectedAvatar.price_range,
      };

      if (formData.includeAI) {
        newAvatar.ai_summary = selectedAvatar.ai_summary;
        newAvatar.ai_summary_generated_at = selectedAvatar.ai_summary_generated_at;
        newAvatar.ad_hooks = selectedAvatar.ad_hooks;
      }

      if (formData.includeImages) {
        newAvatar.generated_image_urls = selectedAvatar.generated_image_urls;
        newAvatar.primary_image_url = selectedAvatar.primary_image_url;
      }

      const { data, error } = await supabase
        .from("avatars")
        .insert(newAvatar)
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Avatar duplicated successfully" });
      setDuplicateDialogOpen(false);
      await loadAvatars();
      setSelectedAvatarId(data.id);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to duplicate avatar",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!selectedAvatarId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("avatars")
        .delete()
        .eq("id", selectedAvatarId);

      if (error) throw error;

      toast({ title: "Avatar deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedAvatarId(null);
      await loadAvatars();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete avatar",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldBlur = async (field: string, value: any) => {
    if (!selectedAvatarId) return;

    try {
      const { error } = await supabase
        .from("avatars")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", selectedAvatarId);

      if (error) throw error;

      // Mark summary as potentially out of date
      if (selectedAvatar?.ai_summary) {
        setIsOutOfDate(true);
      }

      // Refresh the avatar in state
      const updatedAvatars = avatars.map(a => 
        a.id === selectedAvatarId ? { ...a, [field]: value } : a
      );
      setAvatars(updatedAvatars);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: "Failed to save",
        variant: "destructive" 
      });
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedAvatarId) return;
    
    setLoading(true);
    setIsOutOfDate(false);
    try {
      const { data, error } = await supabase.functions.invoke("avatar-generate-summary", {
        body: { avatar_id: selectedAvatarId },
      });

      if (error) throw error;

      toast({ 
        title: "AI Summary Generated",
        description: "Your 250-400 word customer narrative is ready."
      });
      await loadAvatars();
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
    if (!selectedAvatar?.ai_summary) return;
    
    try {
      await navigator.clipboard.writeText(selectedAvatar.ai_summary);
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
    if (!selectedAvatar?.ai_summary) {
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
        body: { avatar_id: selectedAvatarId },
      });

      if (error) throw error;

      toast({ 
        title: "Avatar Images Generated",
        description: "3 customer avatar portraits have been created successfully."
      });
      await loadAvatars();
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
    if (!selectedAvatarId) return;

    try {
      const { error } = await supabase
        .from('avatars')
        .update({ primary_image_url: imageUrl })
        .eq('id', selectedAvatarId);

      if (error) throw error;

      const updatedAvatars = avatars.map(a => 
        a.id === selectedAvatarId ? { ...a, primary_image_url: imageUrl } : a
      );
      setAvatars(updatedAvatars);
      
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

  const hasFormData = selectedAvatar?.demographics || selectedAvatar?.firmographics || selectedAvatar?.goals;

  return (
    <div className="flex h-screen">
      {/* Left Rail */}
      <div className="w-80 border-r bg-card p-4 flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-bold">My Customer Avatars</h2>
          <Input
            placeholder="Search avatars..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="flex-1">
            <Plus className="h-4 w-4 mr-1" />
            New Avatar
          </Button>
          {selectedAvatarId && (
            <>
              <Button 
                onClick={() => setDuplicateDialogOpen(true)} 
                size="sm"
                variant="outline"
              >
                <CopyPlus className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => setDeleteDialogOpen(true)} 
                size="sm"
                variant="outline"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredAvatars.map((avatar) => (
            <AvatarListItem
              key={avatar.id}
              avatar={avatar}
              isSelected={selectedAvatarId === avatar.id}
              onClick={() => setSelectedAvatarId(avatar.id)}
            />
          ))}
          {filteredAvatars.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchTerm ? "No avatars found" : "No avatars yet. Create your first one!"}
            </p>
          )}
        </div>
      </div>

      {/* Right Workspace */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedAvatar ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select an avatar to view details</p>
          </div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="summary">AI Summary</TabsTrigger>
              <TabsTrigger value="images">Avatar Images</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Avatar Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Avatar Name</Label>
                    <Input
                      value={selectedAvatar.avatar_name}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, avatar_name: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("avatar_name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Demographics</Label>
                    <Textarea
                      value={selectedAvatar.demographics || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, demographics: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("demographics", e.target.value)}
                      rows={3}
                      placeholder="Age, gender, location, income, education..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Firmographics</Label>
                    <Textarea
                      value={selectedAvatar.firmographics || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, firmographics: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("firmographics", e.target.value)}
                      rows={3}
                      placeholder="Company size, industry, revenue..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Goals</Label>
                    <Textarea
                      value={selectedAvatar.goals || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, goals: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("goals", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pains</Label>
                    <Textarea
                      value={selectedAvatar.pains || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, pains: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("pains", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Objections</Label>
                    <Textarea
                      value={selectedAvatar.objections || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, objections: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("objections", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Motivators</Label>
                    <Textarea
                      value={selectedAvatar.motivators || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, motivators: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("motivators", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tone & Voice</Label>
                    <Textarea
                      value={selectedAvatar.tone_voice || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, tone_voice: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("tone_voice", e.target.value)}
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
                            const newAreas = [...(selectedAvatar.service_areas || []), newArea];
                            const updated = avatars.map(a => 
                              a.id === selectedAvatarId ? { ...a, service_areas: newAreas } : a
                            );
                            setAvatars(updated);
                            handleFieldBlur("service_areas", newAreas);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAvatar.service_areas?.map((area: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {area}
                          <button
                            type="button"
                            className="ml-2 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const newAreas = selectedAvatar.service_areas?.filter((_: string, idx: number) => idx !== i);
                              const updated = avatars.map(a => 
                                a.id === selectedAvatarId ? { ...a, service_areas: newAreas } : a
                              );
                              setAvatars(updated);
                              handleFieldBlur("service_areas", newAreas);
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
                      value={selectedAvatar.pricing_model || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, pricing_model: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("pricing_model", e.target.value)}
                      placeholder="e.g., Hourly, Project-based, Monthly retainer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <Input
                      value={selectedAvatar.price_range || ""}
                      onChange={(e) => {
                        const updated = avatars.map(a => 
                          a.id === selectedAvatarId ? { ...a, price_range: e.target.value } : a
                        );
                        setAvatars(updated);
                      }}
                      onBlur={(e) => handleFieldBlur("price_range", e.target.value)}
                      placeholder="e.g., $500-$1000 or Starting at $1500"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleGenerateSummary} 
                    disabled={loading || !hasFormData} 
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : selectedAvatar.ai_summary ? "Regenerate AI Summary" : "Generate AI Summary"}
                  </Button>

                  {isOutOfDate && selectedAvatar.ai_summary && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Summary may be out of date</span>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={handleGenerateSummary}
                          disabled={loading}
                          className="h-auto p-0"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Refresh
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedAvatar.ai_summary && (
                    <div className="space-y-3">
                      {selectedAvatar.ai_summary_generated_at && (
                        <p className="text-xs text-muted-foreground">
                          Last generated: {format(new Date(selectedAvatar.ai_summary_generated_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}

                      <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedAvatar.ai_summary}</p>
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

                  {!selectedAvatar.ai_summary && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Click Generate to create an AI-powered 250-400 word narrative of your ideal customer.
                    </p>
                  )}
                </CardContent>
              </Card>

              {selectedAvatar.ad_hooks && selectedAvatar.ad_hooks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ad Hooks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedAvatar.ad_hooks.map((hook: string, i: number) => (
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
            </TabsContent>

            <TabsContent value="images" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Avatar Images</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleGenerateImage}
                    disabled={loadingImage || !selectedAvatar.ai_summary}
                    className="w-full"
                    title={!selectedAvatar.ai_summary ? "Generate an AI summary first" : ""}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {loadingImage ? "Generating..." : selectedAvatar.generated_image_urls?.length > 0 ? "Regenerate Images" : "Generate Images"}
                  </Button>

                  {selectedAvatar.generated_image_urls && selectedAvatar.generated_image_urls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {selectedAvatar.generated_image_urls.map((imageUrl: string, index: number) => {
                        const isPrimary = imageUrl === selectedAvatar.primary_image_url;
                        return (
                          <div
                            key={index}
                            className={`group relative aspect-square rounded-lg overflow-hidden transition-all ${
                              isPrimary ? "ring-2 ring-primary" : ""
                            }`}
                          >
                            <img
                              src={imageUrl}
                              alt={`Avatar ${index + 1}`}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            
                            {isPrimary && (
                              <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                                <Check className="h-3 w-3 text-primary-foreground" />
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
                                  className="w-full text-xs"
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
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {!selectedAvatar.ai_summary 
                        ? "Generate an AI summary first, then come back here to create avatar images." 
                        : "Click Generate to create 3 photorealistic customer portraits."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialogs */}
      <CreateAvatarDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateAvatar}
        loading={loading}
      />
      <DuplicateAvatarDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        originalName={selectedAvatar?.avatar_name || ""}
        onSave={handleDuplicateAvatar}
        loading={loading}
      />
      <DeleteAvatarDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        avatarName={selectedAvatar?.avatar_name || ""}
        onConfirm={handleDeleteAvatar}
        loading={loading}
      />
    </div>
  );
}
