import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ImageOff, ExternalLink, Globe, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AssetDrawer } from "@/components/assets/AssetDrawer";

interface Asset {
  id: string;
  title: string;
  file_url: string | null;
  preview_url: string | null;
  ai_description: string | null;
  similarity: number;
}

interface StockImage {
  id: number;
  title: string;
  thumbnail_url: string;
  full_url: string;
  photographer: string;
  photographer_url: string;
  pexels_url: string;
}

interface PageAssetsTabProps {
  pageId: string;
  buildId: string;
  clientId: string;
  pageType: string;
  pageName: string;
}

const generatePageQuery = (pageType: string, pageName: string): string => {
  const baseQueries: Record<string, string> = {
    home: "Professional hero images, brand photography, welcoming atmosphere, team photos, exterior shots, company overview visuals",
    about: "Team photos, company culture, behind the scenes, office environment, founder portraits, staff headshots",
    services: "Professional service work, quality examples, before and after, process shots",
    service_detail: "Detailed work examples, close-up shots, finished results, professional craftsmanship",
    contact: "Location photos, office exterior, storefront, welcoming entrance, directions imagery",
    gallery: "Portfolio showcase, best work examples, finished projects, professional photography",
    blog: "Blog illustrations, article headers, content imagery, featured photos",
    landing: "Marketing visuals, promotional imagery, hero banners, call to action, featured highlights",
    other: "Professional photography, business imagery, quality visuals"
  };
  
  const baseQuery = baseQueries[pageType] || baseQueries.other;
  
  // For service-related pages, prepend the page name for specificity
  if (['services', 'service_detail', 'other'].includes(pageType)) {
    return `${pageName}, ${baseQuery}`;
  }
  
  return baseQuery;
};

const getSimilarityColor = (similarity: number): string => {
  if (similarity >= 0.5) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (similarity >= 0.3) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-muted text-muted-foreground";
};

const getSimilarityLabel = (similarity: number): string => {
  if (similarity >= 0.5) return "Excellent";
  if (similarity >= 0.3) return "Good";
  return "Fair";
};

export default function PageAssetsTab({ pageId, buildId, clientId, pageType, pageName }: PageAssetsTabProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stockImages, setStockImages] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [savingStock, setSavingStock] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);

  const fetchStockImages = async (query: string) => {
    setLoadingStock(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-stock-images', {
        body: { query, per_page: 12 }
      });

      if (fnError) throw fnError;
      
      if (data.success && data.images) {
        setStockImages(data.images);
      }
    } catch (err) {
      console.error('Error fetching stock images:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const query = generatePageQuery(pageType, pageName);
      console.log(`Fetching asset recommendations for "${pageName}" (${pageType}): "${query}"`);

      const { data, error: fnError } = await supabase.functions.invoke('recommend-assets', {
        body: { 
          caption_text: query, 
          client_id: clientId,
          match_count: 10
        }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      setAssets(data.recommendations || []);
      
      // If we have less than 3 client assets, fetch stock images as fallback
      if ((data.recommendations || []).length < 3) {
        // Use a simpler query for stock images
        const stockQuery = pageType === 'home' 
          ? 'professional business office team' 
          : `${pageName} professional business`;
        fetchStockImages(stockQuery);
      }
    } catch (err) {
      console.error('Error fetching asset recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      // Still try to get stock images on error
      fetchStockImages(pageName);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStockImage = async (image: StockImage) => {
    setSavingStock(image.id);
    try {
      // Download the image
      const response = await fetch(image.full_url);
      if (!response.ok) throw new Error('Failed to download image');
      
      const blob = await response.blob();
      const fileName = `stock-${image.id}-${Date.now()}.jpg`;
      const filePath = `${clientId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('client-assets')
        .getPublicUrl(filePath);

      // Create asset record
      const { error: insertError } = await supabase
        .from('assets')
        .insert([{
          client_id: clientId,
          title: image.title || `Stock image by ${image.photographer}`,
          type: 'image',
          storage_type: 'upload' as const,
          file_url: urlData.publicUrl,
          preview_url: urlData.publicUrl,
          tags: ['stock', 'pexels'],
        }]);

      if (insertError) throw insertError;

      toast.success('Image saved to assets library');
      
      // Remove from stock list
      setStockImages(prev => prev.filter(img => img.id !== image.id));
      
      // Refresh recommendations
      fetchRecommendations();
    } catch (err) {
      console.error('Error saving stock image:', err);
      toast.error('Failed to save image');
    } finally {
      setSavingStock(null);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [clientId, pageType, pageName]);

  const handleViewAsset = async (asset: Asset) => {
    // Fetch full asset details
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('id', asset.id)
      .single();
    
    if (data) {
      setSelectedAsset(data);
      setAssetDrawerOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Finding recommended images...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-5 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <ImageOff className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-sm font-medium">Failed to load recommendations</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRecommendations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Stock images section component
  const renderStockImages = () => {
    if (loadingStock) {
      return (
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Loading stock images...</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (stockImages.length === 0) return null;

    return (
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Stock Images from Pexels</p>
          <span className="text-xs text-muted-foreground">({stockImages.length} results)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stockImages.map((image) => (
            <Card key={image.id} className="overflow-hidden group hover:ring-2 hover:ring-primary/20 transition-all">
              <div className="relative aspect-square bg-muted">
                <img
                  src={image.thumbnail_url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-medium truncate" title={image.title}>
                  {image.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  📷 {image.photographer}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full h-7 text-xs"
                  disabled={savingStock === image.id}
                  onClick={() => handleSaveStockImage(image)}
                >
                  {savingStock === image.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Save to Assets
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (assets.length === 0 && stockImages.length === 0 && !loadingStock) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <ImageOff className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium">No matching assets found</p>
            <p className="text-xs text-muted-foreground">
              Upload more images to the Assets library and run "Analyze Missing" to enable AI recommendations.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRecommendations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        {renderStockImages()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assets.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {assets.length} recommended images for this page
            </p>
            <Button variant="ghost" size="sm" onClick={fetchRecommendations}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {assets.map((asset, index) => (
              <Card key={asset.id} className="overflow-hidden group hover:ring-2 hover:ring-primary/20 transition-all">
                <div className="relative aspect-square bg-muted">
                  {(asset.preview_url || asset.file_url) ? (
                    <img
                      src={asset.preview_url || asset.file_url || ''}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs font-bold"
                  >
                    #{index + 1}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate" title={asset.title}>
                    {asset.title}
                  </p>
                  {asset.ai_description && (
                    <p className="text-xs text-muted-foreground line-clamp-2" title={asset.ai_description}>
                      {asset.ai_description}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getSimilarityColor(asset.similarity)}`}
                    >
                      {getSimilarityLabel(asset.similarity)} {Math.round(asset.similarity * 100)}%
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => handleViewAsset(asset)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {renderStockImages()}

      <AssetDrawer
        asset={selectedAsset}
        open={assetDrawerOpen}
        onOpenChange={setAssetDrawerOpen}
        onUpdate={() => {}}
      />
    </div>
  );
}
