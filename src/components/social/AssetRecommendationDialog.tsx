import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  title: string;
  file_url: string;
  preview_url: string | null;
  ai_description: string | null;
  similarity: number;
}

interface AssetRecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caption: string;
  clientId: string;
  onSelectAsset: (imageUrl: string, source: string) => void;
}

export function AssetRecommendationDialog({
  open,
  onOpenChange,
  caption,
  clientId,
  onSelectAsset
}: AssetRecommendationDialogProps) {
  const [recommendations, setRecommendations] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && caption && clientId) {
      fetchRecommendations();
    }
  }, [open, caption, clientId]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('recommend-assets', {
        body: {
          caption_text: caption,
          client_id: clientId
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(data.recommendations || []);
      
      if (!data.recommendations || data.recommendations.length === 0) {
        setError('no_results');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations';
      
      if (errorMessage.includes('Rate limit')) {
        setError('rate_limit');
      } else if (errorMessage.includes('credits')) {
        setError('no_credits');
      } else {
        setError('general');
      }
      
      toast({
        title: "Couldn't load recommendations",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    onSelectAsset(asset.file_url, 'brand_asset');
    onOpenChange(false);
    toast({
      title: "Asset selected!",
      description: `Using "${asset.title}" for your post`,
    });
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.50) return "text-green-600";
    if (similarity >= 0.35) return "text-yellow-600";
    if (similarity >= 0.20) return "text-orange-600";
    return "text-gray-500";
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.50) return "Excellent Match";
    if (similarity >= 0.35) return "Good Match";
    if (similarity >= 0.20) return "Fair Match";
    return "Possible Match";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            AI-Recommended Assets
          </DialogTitle>
          <DialogDescription>
            We've analyzed your caption and found the most relevant images from your asset library
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing your caption and matching assets...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
            {error === 'no_results' && (
              <>
                <p className="text-center text-muted-foreground">
                  No assets found in your library yet. Upload some images to get AI-powered recommendations!
                </p>
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </>
            )}
            {error === 'rate_limit' && (
              <>
                <p className="text-center text-muted-foreground">
                  Rate limit exceeded. Please try again in a moment.
                </p>
                <Button onClick={fetchRecommendations}>
                  Try Again
                </Button>
              </>
            )}
            {error === 'no_credits' && (
              <>
                <p className="text-center text-muted-foreground">
                  AI credits depleted. Please add credits to your workspace.
                </p>
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </>
            )}
            {error === 'general' && (
              <>
                <p className="text-center text-muted-foreground">
                  Something went wrong. Please try again.
                </p>
                <Button onClick={fetchRecommendations}>
                  Try Again
                </Button>
              </>
            )}
          </div>
        )}

        {!isLoading && !error && recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((asset, index) => (
              <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-all">
                <div className="relative aspect-square bg-muted">
                  <img
                    src={asset.preview_url || asset.file_url}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md">
                    <span className="text-xs font-medium">#{index + 1}</span>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm truncate">{asset.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {asset.ai_description || 'No description available'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className={`h-4 w-4 ${getSimilarityColor(asset.similarity)}`} />
                      <span className={`text-xs font-medium ${getSimilarityColor(asset.similarity)}`}>
                        {getSimilarityLabel(asset.similarity)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(asset.similarity * 100)}%
                    </span>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectAsset(asset)}
                    size="sm"
                  >
                    Use This Image
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}