import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface BlogAIPreferencesFormProps {
  clientId: string;
}

export function BlogAIPreferencesForm({ clientId }: BlogAIPreferencesFormProps) {
  const [topicsToAvoid, setTopicsToAvoid] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  const queryClient = useQueryClient();

  // Fetch existing preferences
  const { data: preferences } = useQuery({
    queryKey: ["blog-ai-preferences", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_ai_preferences")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Load preferences into form
  useEffect(() => {
    if (preferences) {
      setTopicsToAvoid(preferences.topics_to_avoid || "");
      setCustomInstructions(preferences.custom_instructions || "");
    }
  }, [preferences]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("blog_ai_preferences")
        .upsert({
          client_id: clientId,
          topics_to_avoid: topicsToAvoid,
          custom_instructions: customInstructions,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-ai-preferences", clientId] });
      toast.success("AI preferences saved successfully");
    },
    onError: (error) => {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    },
  });


  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Writing Preferences</CardTitle>
        <CardDescription>
          Customize how the AI generates your blog content (brand voice, audience, and keywords are pulled from your existing profile)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topics-to-avoid">Topics to Avoid</Label>
          <Textarea
            id="topics-to-avoid"
            placeholder="List any subjects, angles, or approaches you don't want covered in your blog content..."
            value={topicsToAvoid}
            onChange={(e) => setTopicsToAvoid(e.target.value)}
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Topics or approaches to stay away from
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-instructions">Additional Instructions</Label>
          <Textarea
            id="custom-instructions"
            placeholder="Any other specific instructions for the AI (e.g., 'Always include data and statistics', 'Use conversational examples', 'Keep paragraphs under 3 sentences')..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={6}
          />
          <p className="text-sm text-muted-foreground">
            Custom guidelines for how the AI should write your content
          </p>
        </div>

        <Button
          onClick={() => savePreferencesMutation.mutate()}
          disabled={savePreferencesMutation.isPending}
          className="w-full"
        >
          {savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
