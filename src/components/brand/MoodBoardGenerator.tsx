import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

interface MoodBoardGeneratorProps {
  brandGuide: any;
  clientId: string;
  onComplete: () => void;
}

export default function MoodBoardGenerator({ brandGuide, clientId, onComplete }: MoodBoardGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error("Error", { description: "Please enter a title for your mood board" });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mood-board", {
        body: {
          client_id: clientId,
          brand_guide_id: brandGuide.id,
          title: title.trim(),
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
          custom_notes: customNotes,
          brand_guide: {
            aesthetic: brandGuide.aesthetic,
            primary_color: brandGuide.primary_color,
            secondary_color: brandGuide.secondary_color,
            accent_color: brandGuide.accent_color,
            brand_personality: brandGuide.brand_personality
          }
        }
      });

      if (error) throw error;

      toast.success("Success", { description: "Mood board generated successfully!" });

      setTitle("");
      setKeywords("");
      setCustomNotes("");
      onComplete();
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to generate mood board" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate AI Mood Board</CardTitle>
        <CardDescription>
          Create visual inspiration based on your brand guide
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mood Board Title</Label>
          <Input
            placeholder="E.g., Summer Campaign 2024"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Keywords (comma-separated)</Label>
          <Input
            placeholder="E.g., modern, minimal, nature, tech"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Enter 3-5 keywords that describe the mood you're going for
          </p>
        </div>

        <div className="space-y-2">
          <Label>Additional Notes (optional)</Label>
          <Textarea
            placeholder="Any specific visual references or styles you'd like to include..."
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2 text-sm">Brand Context</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Aesthetic:</span>
              <span className="ml-2 capitalize">{brandGuide?.aesthetic}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">Colors:</span>
              <div className="flex gap-1">
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: brandGuide?.primary_color }}
                />
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: brandGuide?.secondary_color }}
                />
                <div
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: brandGuide?.accent_color }}
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Mood Board
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
