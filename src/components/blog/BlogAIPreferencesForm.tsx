import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

interface BlogAIPreferencesFormProps {
  clientId: string;
}

export function BlogAIPreferencesForm({ clientId }: BlogAIPreferencesFormProps) {
  const [brandVoice, setBrandVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [topicsToAvoid, setTopicsToAvoid] = useState("");
  const [contentGuidelines, setContentGuidelines] = useState("");
  const [industryContext, setIndustryContext] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

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
      setBrandVoice(preferences.brand_voice || "");
      setTargetAudience(preferences.target_audience || "");
      setTopicsToAvoid(preferences.topics_to_avoid || "");
      setContentGuidelines(preferences.content_guidelines || "");
      setIndustryContext(preferences.industry_context || "");
      setKeywords(preferences.preferred_keywords || []);
    }
  }, [preferences]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("blog_ai_preferences")
        .upsert({
          client_id: clientId,
          brand_voice: brandVoice,
          target_audience: targetAudience,
          topics_to_avoid: topicsToAvoid,
          content_guidelines: contentGuidelines,
          industry_context: industryContext,
          preferred_keywords: keywords,
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

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Context & Preferences</CardTitle>
        <CardDescription>
          Provide context to help the AI generate content that matches your brand voice and style
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="brand-voice">Brand Voice & Tone</Label>
          <Textarea
            id="brand-voice"
            placeholder="e.g., Professional but friendly, technical and authoritative, casual and conversational"
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Describe your writing style and tone
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-audience">Target Audience</Label>
          <Input
            id="target-audience"
            placeholder="e.g., B2B marketing managers, tech-savvy developers, small business owners"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Who are you writing for?
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry-context">Industry/Niche Context</Label>
          <Input
            id="industry-context"
            placeholder="e.g., Healthcare SaaS, B2B consulting, E-commerce retail"
            value={industryContext}
            onChange={(e) => setIndustryContext(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Your specific industry or niche details
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred-keywords">Preferred Keywords/Themes</Label>
          <div className="flex gap-2">
            <Input
              id="preferred-keywords"
              placeholder="Add a keyword or theme"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordInputKeyDown}
            />
            <Button type="button" onClick={handleAddKeyword} variant="secondary">
              Add
            </Button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveKeyword(keyword)}
                  />
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Important keywords or recurring themes to emphasize
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content-guidelines">Content Guidelines</Label>
          <Textarea
            id="content-guidelines"
            placeholder="e.g., Always include actionable tips, cite industry statistics, use real-world examples"
            value={contentGuidelines}
            onChange={(e) => setContentGuidelines(e.target.value)}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Any specific requirements for your content
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="topics-to-avoid">Topics to Avoid</Label>
          <Textarea
            id="topics-to-avoid"
            placeholder="List subjects or angles you don't want covered"
            value={topicsToAvoid}
            onChange={(e) => setTopicsToAvoid(e.target.value)}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Topics or approaches to stay away from
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
