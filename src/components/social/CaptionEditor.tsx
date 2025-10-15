import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft } from "lucide-react";
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
  const [captions, setCaptions] = useState<any[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<any>(null);
  const [editedCaption, setEditedCaption] = useState('');
  const [addHashtags, setAddHashtags] = useState(true);
  const [hashtags, setHashtags] = useState<string[]>([]);

  useEffect(() => {
    generateCaptions();
  }, []);

  const generateCaptions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-generate-captions', {
        body: {
          client_id: selectedClient?.id,
          post_idea: postIdea,
          topic_category: postIdea.topic_category,
        }
      });

      if (error) throw error;

      setCaptions(data.captions || []);
    } catch (error: any) {
      console.error('Error generating captions:', error);
      toast({
        title: "Couldn't generate captions",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectCaption = (caption: any) => {
    setSelectedCaption(caption);
    setEditedCaption(caption.text);
    setHashtags(caption.suggested_hashtags || []);
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
    onComplete(editedCaption, selectedCaption?.tone || 'custom', finalHashtags);
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'Friendly': return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'Professional': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'Fun': return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      default: return 'bg-muted';
    }
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

      {/* Loading State */}
      {isGenerating && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Writing captions for you...</p>
          </CardContent>
        </Card>
      )}

      {/* Caption Options */}
      {!isGenerating && captions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Choose a Tone</h3>
          <div className="grid gap-4">
            {captions.map((caption, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all ${getToneColor(caption.tone)} ${
                  selectedCaption?.tone === caption.tone ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectCaption(caption)}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {caption.tone}
                    {selectedCaption?.tone === caption.tone && (
                      <Badge variant="default" className="ml-auto">Selected</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{caption.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Caption */}
      {selectedCaption && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Your Caption</CardTitle>
            <CardDescription>
              Make it your own. Add your personal touch or use it as-is.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={6}
                className="resize-none"
                placeholder="Write your caption here..."
              />
              <p className="text-sm text-muted-foreground mt-2">
                {editedCaption.split(' ').length} words
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="hashtags"
                checked={addHashtags}
                onCheckedChange={setAddHashtags}
              />
              <Label htmlFor="hashtags">Add hashtags automatically</Label>
            </div>

            {addHashtags && hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {selectedCaption && (
          <Button onClick={handleContinue} size="lg" className="flex-1">
            Continue to Image
          </Button>
        )}
      </div>
    </div>
  );
};