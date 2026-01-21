import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { RefreshCw, ImageOff, ExternalLink, Globe, Download, Loader2, Search, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AssetDrawer } from "@/components/assets/AssetDrawer";
import { logApiError, isQuotaError } from "@/lib/apiErrorLogger";

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

interface ServiceContext {
  name: string;
  description: string | null;
}

interface PageAssetsTabProps {
  pageId: string;
  buildId: string;
  clientId: string;
  pageType: string;
  pageName: string;
  clientName?: string;
  clientIndustry?: string;
  clientLocation?: string;
  serviceAreas?: string[];
  services?: ServiceContext[];
}

// Extract business keywords from client name
const extractBusinessKeywords = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/\.(com|net|org|io|co|biz)$/i, '')
    .replace(/^(my|the|home|best|top|pro)/gi, ' ')
    .split(/(?=[A-Z])|[-_.\s]+/)
    .filter(word => word.length > 2)
    .map(word => word.toLowerCase())
    .join(' ')
    .trim();
};

// Extract meaningful keywords from service description
const extractDescriptionKeywords = (description?: string | null): string => {
  if (!description) return '';
  const stopWords = ['the', 'and', 'or', 'of', 'to', 'a', 'an', 'in', 'for', 'is', 'are', 'we', 'our', 'your', 'with', 'that', 'this', 'will', 'can', 'all', 'from', 'have', 'has', 'been', 'their', 'you', 'be'];
  return description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 4)
    .join(' ');
};

// Generate context-aware stock query using services, location, and business info
const generateStockQuery = (
  pageType: string,
  pageName: string,
  clientName?: string,
  clientIndustry?: string,
  clientLocation?: string,
  serviceAreas?: string[],
  services?: ServiceContext[]
): string => {
  // Try to find a matching service for this page
  const matchingService = services?.find(s => {
    const serviceName = s.name.toLowerCase();
    const pageNameLower = pageName.toLowerCase();
    return serviceName.includes(pageNameLower) || 
           pageNameLower.includes(serviceName.split(' ')[0]) ||
           serviceName.split(' ').some(word => word.length > 3 && pageNameLower.includes(word));
  });

  // Build context from best available data
  const serviceContext = matchingService?.name || '';
  const descriptionKeywords = extractDescriptionKeywords(matchingService?.description);
  const nameKeywords = extractBusinessKeywords(clientName || '');
  const industryContext = clientIndustry && clientIndustry !== 'Service' ? clientIndustry : nameKeywords;
  const locationContext = clientLocation || (serviceAreas?.[0]) || '';
  
  // For service detail pages, prioritize the service name and description
  if (pageType === 'service_detail' || (pageType === 'services' && matchingService)) {
    const parts = [serviceContext, descriptionKeywords, locationContext].filter(Boolean);
    return parts.join(' ').trim() || `${industryContext} professional work`;
  }
  
  // For home/about/general pages, use broader business context
  const baseQueries: Record<string, string> = {
    home: `${industryContext} professional hero business ${locationContext}`.trim(),
    about: `${industryContext} team culture office ${locationContext}`.trim(),
    services: `${industryContext} ${pageName} professional work ${locationContext}`.trim(),
    contact: `office exterior building ${locationContext}`.trim(),
    gallery: `${industryContext} portfolio finished projects ${locationContext}`.trim(),
    blog: `${industryContext} article imagery professional`.trim(),
    landing: `${industryContext} marketing hero ${locationContext}`.trim(),
    other: `${industryContext} ${pageName} professional`.trim()
  };
  
  return (baseQueries[pageType] || baseQueries.other).replace(/\s+/g, ' ').trim();
};

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

export default function PageAssetsTab({ pageId, buildId, clientId, pageType, pageName, clientName, clientIndustry, clientLocation, serviceAreas, services }: PageAssetsTabProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stockImages, setStockImages] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [savingStock, setSavingStock] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState(false);
  
  // Stock search state
  const [stockQuery, setStockQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

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
      toast.error('Failed to load stock images');
    } finally {
      setLoadingStock(false);
    }
  };

  const handleStockSearch = () => {
    if (!stockQuery.trim()) return;
    setHasSearched(true);
    fetchStockImages(stockQuery);
  };

  const handleClearSearch = () => {
    setStockQuery('');
    setHasSearched(false);
    // Revert to context-aware query with full business context
    const autoQuery = generateStockQuery(pageType, pageName, clientName, clientIndustry, clientLocation, serviceAreas, services);
    fetchStockImages(autoQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStockSearch();
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    setQuotaWarning(false);

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

      // Handle quota/rate limit errors gracefully
      if (data.error) {
        if (isQuotaError(data.error)) {
          console.warn('OpenAI quota exceeded - falling back to stock images');
          setQuotaWarning(true);
          setAssets([]);
          
          // Log the error for admin visibility
          await logApiError({
            functionName: 'recommend-assets',
            errorMessage: data.error,
            errorType: 'openai_quota',
            clientId,
            metadata: { pageId, pageName, pageType }
          });
          
          // Load stock images as fallback with full client context
          const stockSearchQuery = generateStockQuery(pageType, pageName, clientName, clientIndustry, clientLocation, serviceAreas, services);
          fetchStockImages(stockSearchQuery);
          return;
        }
        throw new Error(data.error);
      }

      setAssets(data.recommendations || []);
      
      // If we have less than 3 client assets, fetch stock images as fallback
      if ((data.recommendations || []).length < 3) {
        const stockSearchQuery = generateStockQuery(pageType, pageName, clientName, clientIndustry, clientLocation, serviceAreas, services);
        fetchStockImages(stockSearchQuery);
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

  // Stock images section component
  const renderStockImages = () => {
    return (
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Search Stock Photos</p>
        </div>
        
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stock photos..."
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button onClick={handleStockSearch} disabled={loadingStock || !stockQuery.trim()}>
            {loadingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
          {hasSearched && (
            <Button variant="outline" onClick={handleClearSearch}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stock Loading State */}
        {loadingStock && (
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
        )}

        {/* Stock Results */}
        {!loadingStock && stockImages.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {hasSearched ? `Results for "${stockQuery}"` : 'Suggested images from Pexels'} • {stockImages.length} images
            </p>
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
          </>
        )}

        {/* No Results State */}
        {!loadingStock && stockImages.length === 0 && hasSearched && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No results for "{stockQuery}". Try a different search term.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Error state (but not quota warning - that shows stock images)
  if (error && !quotaWarning) {
    return (
      <div className="space-y-6">
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
        {renderStockImages()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quota Warning Banner */}
      {quotaWarning && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium">Client asset recommendations temporarily unavailable</p>
              <p className="text-xs text-muted-foreground">An API quota limit was reached. This has been logged for admin review. Stock images are available below.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Assets */}
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

      {assets.length === 0 && !quotaWarning && (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <ImageOff className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No matching client assets</p>
            <p className="text-xs text-muted-foreground">
              Search for stock images below to add to the client's library.
            </p>
          </div>
        </div>
      )}

      {/* Stock Images Section - Always Visible */}
      {renderStockImages()}

      {selectedAsset && (
        <AssetDrawer
          asset={selectedAsset}
          open={assetDrawerOpen}
          onOpenChange={setAssetDrawerOpen}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
}
