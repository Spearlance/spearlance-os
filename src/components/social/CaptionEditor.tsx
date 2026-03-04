import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, Sparkles } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CaptionEditorProps {
  postIdea: any;
  onComplete: (caption: string, tone: string, hashtags: string[]) => void;
  onBack: () => void;
}

export const CaptionEditor = ({ postIdea, onComplete, onBack }: CaptionEditorProps) => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [caption, setCaption] = useState<any>(null);
  const [editedCaption, setEditedCaption] = useState('');
  const [addHashtags, setAddHashtags] = useState(true);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [regenerateCount, setRegenerateCount] = useState(0);

  useEffect(() => {
    generateCaptions();
  }, []);

  const generateCaptions = async (isRegenerate = false) => {
    try {
      if (isRegenerate) {
        setIsRegenerating(true);
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const { data, error } = await supabase.functions.invoke('social-generate-captions', {
        body: { 
          client_id: selectedClient?.id,
          post_idea: postIdea,
          topic_category: postIdea.category,
          variation_number: regenerateCount
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (error) {
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          throw new Error('You\'ve hit the AI usage limit. Please wait a moment and try again.');
        } else if (error.message?.includes('usage limit') || error.message?.includes('402')) {
          throw new Error('AI usage limit reached. Please add credits to your workspace.');
        }
        throw error;
      }
      
      if (data?.caption) {
        setCaption(data.caption);
        setEditedCaption(data.caption.text);
        setHashtags(data.caption.suggested_hashtags || []);
        if (isRegenerate) {
          setRegenerateCount(prev => prev + 1);
        }
      }
    } catch (error: any) {
      let errorMessage = "Please try again";
      
      if (error.name === 'AbortError') {
        errorMessage = 'Caption generation took too long. Please try again.';
      } else if (error.message?.includes('Rate limit')) {
        errorMessage = 'You\'ve hit the AI usage limit. Please wait a moment and try again.';
      } else if (error.message?.includes('usage limit')) {
        errorMessage = 'AI usage limit reached. Please add credits to your workspace.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Couldn't generate caption",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = () => {
    generateCaptions(true);
  };

  const handleContinue = () => {
    if (!editedCaption.trim()) {
      toast({
        title: "Caption required",
        description: "Please write a caption for your post",
        variant: "destructive"
      });
      return;
    }

    const finalHashtags = addHashtags ? hashtags : [];
    onComplete(editedCaption, 'contextual', finalHashtags);
  };


  return (
    <div className="space-y-6">
      {/* Selected Idea */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{postIdea?.title}</CardTitle>
              <CardDescription className="text-sm mt-1">{postIdea?.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Crafting your perfect caption...</p>
        </div>
      ) : caption ? (
        <div className="space-y-6">
          {/* Generated Caption Card */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">🎯 Your Caption</h3>
                    <p className="text-sm leading-relaxed">{caption.text}</p>
                  </div>

                  {caption.reasoning && (
                    <div className="bg-background/50 rounded-lg p-3 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">💡 Why this works:</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {caption.reasoning}
                      </p>
                    </div>
                  )}

                  {caption.suggested_hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {caption.suggested_hashtags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="w-full mt-2"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      '🔄 Generate Different Caption'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Caption Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="caption-edit" className="text-base font-semibold">✏️ Edit Your Caption</Label>
              <Textarea
                id="caption-edit"
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={6}
                className="resize-none"
                placeholder="Edit your caption here..."
              />
              <p className="text-xs text-muted-foreground">
                {editedCaption.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="add-hashtags"
                checked={addHashtags}
                onCheckedChange={setAddHashtags}
              />
              <Label htmlFor="add-hashtags">Add hashtags automatically</Label>
            </div>

            {addHashtags && hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {caption && (
          <Button onClick={handleContinue} size="lg" className="flex-1">
            Continue to Image
          </Button>
        )}
      </div>
    </div>
  );
};