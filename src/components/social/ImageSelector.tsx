import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FolderOpen, Sparkles, ChevronLeft, Loader2 } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssetRecommendationDialog } from "./AssetRecommendationDialog";

interface ImageSelectorProps {
  caption: string;
  onComplete: (imageUrl: string, source: string, prompt: string) => void;
  onBack: () => void;
}

export const ImageSelector = ({ caption, onComplete, onBack }: ImageSelectorProps) => {
  const { selectedClient } = useClient();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [loadingMessage, setLoadingMessage] = useState("Creating your image...");
  const [showRetry, setShowRetry] = useState(false);
  const [showAssetRecommendations, setShowAssetRecommendations] = useState(false);

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
      toast.error("Upload failed", { description: error.message });
    }
  };

  const handleGenerateAI = async (mode: 'ai_only' | 'with_upload' | 'with_brand_asset', referenceImage?: string) => {
    setIsGenerating(true);
    setShowRetry(false);
    setLoadingMessage("Creating your image...");
    
    // Progressive loading messages
    const messageTimers: NodeJS.Timeout[] = [];
    messageTimers.push(setTimeout(() => setLoadingMessage("Still working on it..."), 5000));
    messageTimers.push(setTimeout(() => setLoadingMessage("Almost there, hang tight..."), 15000));
    messageTimers.push(setTimeout(() => setLoadingMessage("This is taking longer than usual, but we're still working on it..."), 30000));
    
    // Cleanup function for timers
    const clearTimers = () => messageTimers.forEach(timer => clearTimeout(timer));
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const { data, error } = await supabase.functions.invoke('social-generate-image', {
        body: {
          client_id: selectedClient?.id,
          caption_text: caption,
          image_mode: mode,
          reference_image: referenceImage,
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (error) {
        // Handle specific error types
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          throw new Error('You\'ve hit the AI usage limit. Please wait a moment and try again.');
        } else if (error.message?.includes('usage limit') || error.message?.includes('402')) {
          throw new Error('AI usage limit reached. Please add credits to your workspace.');
        }
        throw error;
      }

      setGeneratedImages(data.images || []);
      setShowRetry(false);
    } catch (error: any) {
      let errorMessage = "Please try again";
      
      if (error.name === 'AbortError') {
        errorMessage = 'Image generation took too long. Try using a simpler image or try again.';
      } else if (error.message?.includes('Rate limit')) {
        errorMessage = 'You\'ve hit the AI usage limit. Please wait a moment and try again.';
      } else if (error.message?.includes('usage limit')) {
        errorMessage = 'AI usage limit reached. Please add credits to your workspace.';
      } else if (error.message?.includes('Connection') || error.message?.includes('network')) {
        errorMessage = 'Connection timed out. Please check your internet and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error("Couldn't generate image", { description: errorMessage });
      
      setShowRetry(true);
    } finally {
      clearTimers();
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
            <CardDescription>AI picks your best matches</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full"
              onClick={() => setShowAssetRecommendations(true)}
            >
              Choose from Assets
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
              <p className="text-lg font-medium">{loadingMessage}</p>
              <div className="flex flex-col gap-1 items-center">
                <p className="text-sm text-muted-foreground">⏳ Loading brand information</p>
                <p className="text-sm text-muted-foreground">🎨 Generating image with AI</p>
                <p className="text-sm text-muted-foreground">💾 Saving to your assets</p>
              </div>
            </div>
          )}
          
          {showRetry && !isGenerating && (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-muted-foreground">Generation failed. Would you like to try again?</p>
              <Button
                onClick={() => handleGenerateAI('ai_only')}
                size="lg"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Retry Generation
              </Button>
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

      {/* Asset Recommendations Dialog */}
      <AssetRecommendationDialog
        open={showAssetRecommendations}
        onOpenChange={setShowAssetRecommendations}
        caption={caption}
        clientId={selectedClient?.id || ''}
        onSelectAsset={(imageUrl, source) => onComplete(imageUrl, source, '')}
      />

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