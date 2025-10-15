import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FolderOpen, Sparkles, ChevronLeft, Loader2 } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageSelectorProps {
  caption: string;
  onComplete: (imageUrl: string, source: string, prompt: string) => void;
  onBack: () => void;
}

export const ImageSelector = ({ caption, onComplete, onBack }: ImageSelectorProps) => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedClient?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('client-assets')
        .getPublicUrl(fileName);

      onComplete(data.publicUrl, 'uploaded', '');
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleGenerateAI = async (mode: 'ai_only' | 'with_upload' | 'with_brand_asset', referenceImage?: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-generate-image', {
        body: {
          client_id: selectedClient?.id,
          caption_text: caption,
          image_mode: mode,
          reference_image: referenceImage,
        }
      });

      if (error) throw error;

      setGeneratedImages(data.images || []);
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast({
        title: "Couldn't generate image",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Add or Generate Your Image</h3>
        <p className="text-muted-foreground">
          Choose how you want to create your post image
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center mb-2">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg">Upload My Photo</CardTitle>
            <CardDescription>Use a photo you already have</CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor="photo-upload">
              <Button asChild size="lg" className="w-full">
                <span>Choose Photo</span>
              </Button>
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center mb-2">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg">Use Brand Asset</CardTitle>
            <CardDescription>Select from your assets</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all border-primary/50">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg">Generate with AI</CardTitle>
            <CardDescription>Create a custom image</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setShowAIDialog(true);
                handleGenerateAI('ai_only');
              }}
            >
              Generate Image
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Image Generator</DialogTitle>
            <DialogDescription>
              Creating images based on your caption and brand
            </DialogDescription>
          </DialogHeader>

          {isGenerating && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Creating your image...</p>
              <p className="text-sm text-muted-foreground">This usually takes 10-15 seconds</p>
            </div>
          )}

          {!isGenerating && generatedImages.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pick the image you like best
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {generatedImages.map((img, index) => (
                  <Card key={index} className="overflow-hidden">
                    <img
                      src={img.image_url}
                      alt={`Generated variation ${index + 1}`}
                      className="w-full h-64 object-cover"
                    />
                    <CardContent className="pt-4">
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={() => {
                          onComplete(img.image_url, 'ai_generated', img.prompt_used);
                          setShowAIDialog(false);
                        }}
                      >
                        Use This Image
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => handleGenerateAI('ai_only')}
              >
                Regenerate New Images
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  );
};