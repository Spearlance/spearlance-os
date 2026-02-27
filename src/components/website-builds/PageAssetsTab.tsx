import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { RefreshCw, ImageOff, ExternalLink, Globe, Download, Loader2, Search, X, AlertTriangle, Trash2, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AssetDrawer } from "@/components/assets/AssetDrawer";
import { AssetLibraryPicker } from "./AssetLibraryPicker";
import { logApiError, isQuotaError } from "@/lib/apiErrorLogger";

interface PageAsset {
  id: string;
  title: string;
  file_url: string | null;
  preview_url: string | null;
  type: string;
}

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

// Helper to fetch asset usage counts across the build - uses type assertion to avoid TS depth issues
async function getBuildAssetUsageCounts(buildId: string, currentPageId: string): Promise<Map<string, number>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagesTable = supabase.from('website_pages') as any;
    const { data: pages } = await pagesTable.select('id').eq('build_id', buildId);
    
    if (!pages || pages.length === 0) return new Map();
    
    // Exclude current page from usage count (we want to show "used on OTHER pages")
    const otherPageIds = pages.filter((p: { id: string }) => p.id !== currentPageId).map((p: { id: string }) => p.id);
    
    if (otherPageIds.length === 0) return new Map();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assetsTable = supabase.from('website_page_assets') as any;
    const { data: linkedAssets } = await assetsTable.select('asset_id, page_id').in('page_id', otherPageIds);
    
    // Count how many times each asset is used on other pages
    const counts = new Map<string, number>();
    (linkedAssets || []).forEach((a: { asset_id: string }) => {
      counts.set(a.asset_id, (counts.get(a.asset_id) || 0) + 1);
    });
    
    return counts;
  } catch (err) {
    console.error('Error fetching build asset usage:', err);
    return new Map();
  }
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

// Transform raw similarity (typically 0.15-0.60) to display percentage (50-99%)
const getDisplaySimilarity = (rawSimilarity: number): number => {
  const MIN_RAW = 0.15;
  const MAX_RAW = 0.60;
  const MIN_DISPLAY = 50;
  const MAX_DISPLAY = 99;
  
  const clamped = Math.min(Math.max(rawSimilarity, MIN_RAW), MAX_RAW);
  const normalized = (clamped - MIN_RAW) / (MAX_RAW - MIN_RAW);
  return Math.round(MIN_DISPLAY + normalized * (MAX_DISPLAY - MIN_DISPLAY));
};

const getSimilarityColor = (displayScore: number): string => {
  if (displayScore >= 80) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (displayScore >= 65) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-muted text-muted-foreground";
};

const getSimilarityLabel = (displayScore: number): string => {
  if (displayScore >= 80) return "Excellent";
  if (displayScore >= 65) return "Good";
  return "Fair";
};

export default function PageAssetsTab({ pageId, buildId, clientId, pageType, pageName, clientName, clientIndustry, clientLocation, serviceAreas, services }: PageAssetsTabProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pageAssets, setPageAssets] = useState<PageAsset[]>([]);
  const [stockImages, setStockImages] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPageAssets, setLoadingPageAssets] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [savingStock, setSavingStock] = useState<number | null>(null);
  const [unlinkingAsset, setUnlinkingAsset] = useState<string | null>(null);
  const [linkingRecommendedAsset, setLinkingRecommendedAsset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [buildAssetUsage, setBuildAssetUsage] = useState<Map<string, number>>(new Map());
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState(false);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  
  // Stock search state
  const [stockQuery, setStockQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch asset usage counts across the build (for "used elsewhere" indicator)
  const fetchBuildAssetUsage = useCallback(async () => {
    const counts = await getBuildAssetUsageCounts(buildId, pageId);
    setBuildAssetUsage(counts);
  }, [buildId, pageId]);

  // Fetch assets explicitly linked to this page
  const fetchPageAssets = useCallback(async () => {
    setLoadingPageAssets(true);
    try {
      const { data, error } = await supabase
        .from('website_page_assets')
        .select(`
          asset_id,
          assets (
            id,
            title,
            file_url,
            preview_url,
            type
          )
        `)
        .eq('page_id', pageId);

      if (error) throw error;

      const linkedAssets = data
        ?.map(d => d.assets as unknown as PageAsset)
        .filter(Boolean) || [];
      
      setPageAssets(linkedAssets);
    } catch (err) {
      console.error('Error fetching page assets:', err);
    } finally {
      setLoadingPageAssets(false);
    }
  }, [pageId]);

  // Unlink an asset from this page
  const handleUnlinkAsset = async (assetId: string) => {
    setUnlinkingAsset(assetId);
    try {
      const { error } = await supabase
        .from('website_page_assets')
        .delete()
        .eq('page_id', pageId)
        .eq('asset_id', assetId);

      if (error) throw error;

      toast.success('Asset removed from page');
      fetchPageAssets();
    } catch (err) {
      console.error('Error unlinking asset:', err);
      toast.error('Failed to remove asset');
    } finally {
      setUnlinkingAsset(null);
    }
  };

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

      const { data, error: fnError } = await supabase.functions.invoke('recommend-assets', {
        body: { 
          caption_text: query, 
          client_id: clientId,
          match_count: 15
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

      // Filter out assets already linked to this page, then sort unused first, limit to 10
      const recommendations = (data.recommendations || [])
        .filter((asset: Asset) => !pageAssets.some(pa => pa.id === asset.id))
        .sort((a: Asset, b: Asset) => {
          // Sort: unused assets first, then by similarity
          const aUsed = buildAssetUsage.has(a.id) ? 1 : 0;
          const bUsed = buildAssetUsage.has(b.id) ? 1 : 0;
          return aUsed - bUsed;
        })
        .slice(0, 10);
      
      setAssets(recommendations);
      
      // If we have less than 3 client assets, fetch stock images as fallback
      if (recommendations.length < 3) {
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

  // Link a recommended asset to this page
  const handleLinkRecommendedAsset = async (assetId: string) => {
    setLinkingRecommendedAsset(assetId);
    try {
      const { error } = await supabase
        .from('website_page_assets')
        .insert([{ page_id: pageId, asset_id: assetId }]);
      
      if (error) throw error;
      
      toast.success('Asset added to page');
      fetchPageAssets();
      fetchBuildAssetUsage();
      
      // Remove from recommendations list
      setAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (err) {
      console.error('Error linking recommended asset:', err);
      toast.error('Failed to add asset');
    } finally {
      setLinkingRecommendedAsset(null);
    }
  };

  // Get or create "Stock Images" folder for organization
  const getOrCreateStockFolder = async (targetClientId: string): Promise<string> => {
    // Check if "Stock Images" folder exists at root level
    const { data: existingFolder } = await supabase
      .from('asset_folders')
      .select('id')
      .eq('client_id', targetClientId)
      .eq('name', 'Stock Images')
      .is('parent_folder_id', null)
      .single();

    if (existingFolder) {
      return existingFolder.id;
    }

    // Create the folder with a distinct indigo color
    const { data: newFolder, error } = await supabase
      .from('asset_folders')
      .insert({
        client_id: targetClientId,
        name: 'Stock Images',
        parent_folder_id: null,
        color: '#6366f1'
      })
      .select('id')
      .single();

    if (error) throw error;
    return newFolder.id;
  };

  const handleSaveStockImage = async (image: StockImage) => {
    setSavingStock(image.id);
    try {
      // Get or create Stock Images folder
      const stockFolderId = await getOrCreateStockFolder(clientId);

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

      // Create asset record with folder_id
      const { data: assetData, error: insertError } = await supabase
        .from('assets')
        .insert([{
          client_id: clientId,
          folder_id: stockFolderId,
          title: image.title || `Stock image by ${image.photographer}`,
          type: 'image',
          storage_type: 'upload' as const,
          file_url: urlData.publicUrl,
          preview_url: urlData.publicUrl,
          tags: ['stock', 'pexels'],
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Link asset to this page
      const { error: linkError } = await supabase
        .from('website_page_assets')
        .insert([{
          page_id: pageId,
          asset_id: assetData.id
        }]);

      if (linkError) {
        console.error('Failed to link asset to page:', linkError);
      }

      // Trigger AI analysis in background for description & embeddings
      supabase.functions.invoke('analyze-asset', {
        body: { asset_id: assetData.id }
      }).catch(err => console.error('AI analysis failed:', err));

      toast.success('Image saved and added to this page');
      
      // Remove from stock list
      setStockImages(prev => prev.filter(img => img.id !== image.id));
      
      // Refresh page assets to show the new one
      fetchPageAssets();
    } catch (err) {
      console.error('Error saving stock image:', err);
      toast.error('Failed to save image');
    } finally {
      setSavingStock(null);
    }
  };

  useEffect(() => {
    fetchBuildAssetUsage();
  }, [fetchBuildAssetUsage]);

  useEffect(() => {
    fetchRecommendations();
    fetchPageAssets();
  }, [clientId, pageType, pageName, fetchPageAssets, buildAssetUsage]);

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

  // Render page assets section
  const renderPageAssets = () => {
    if (loadingPageAssets) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Assets for This Page</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-2">
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    // Show empty state with Add from Library button when no assets
    if (pageAssets.length === 0) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Assets for This Page</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto h-7 text-xs"
              onClick={() => setLibraryPickerOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add from Library
            </Button>
          </div>
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No assets linked to this page yet. Add from your library or save stock images below.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Assets for This Page</p>
          <Badge variant="secondary">{pageAssets.length}</Badge>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto h-7 text-xs"
            onClick={() => setLibraryPickerOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add from Library
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pageAssets.map((asset) => (
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
              </div>
              <CardContent className="p-2 space-y-1">
                <p className="text-xs font-medium truncate" title={asset.title}>
                  {asset.title}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={unlinkingAsset === asset.id}
                  onClick={() => handleUnlinkAsset(asset.id)}
                >
                  {unlinkingAsset === asset.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
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

  return (
    <div className="space-y-4">
      {/* Page Assets Section - Explicitly linked assets */}
      {renderPageAssets()}

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

      {/* Client Assets (AI Recommendations) */}
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
            {assets.map((asset, index) => {
              const usageCount = buildAssetUsage.get(asset.id) || 0;
              const isUsedElsewhere = usageCount > 0;
              
              return (
              <Card 
                key={asset.id} 
                className={`overflow-hidden group transition-all ${
                  isUsedElsewhere 
                    ? 'ring-1 ring-warning/30 bg-warning/5' 
                    : 'hover:ring-2 hover:ring-primary/20'
                }`}
              >
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
                  {isUsedElsewhere && (
                    <Badge 
                      className="absolute top-2 right-2 bg-warning text-warning-foreground border-0 text-[10px] px-1.5"
                    >
                      Used on {usageCount} page{usageCount > 1 ? 's' : ''}
                    </Badge>
                  )}
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
                      className={`text-xs ${getSimilarityColor(getDisplaySimilarity(asset.similarity))}`}
                    >
                      {getSimilarityLabel(getDisplaySimilarity(asset.similarity))} {getDisplaySimilarity(asset.similarity)}%
                    </Badge>
                    <div className="flex gap-1">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        disabled={linkingRecommendedAsset === asset.id}
                        onClick={() => handleLinkRecommendedAsset(asset.id)}
                      >
                        {linkingRecommendedAsset === asset.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => handleViewAsset(asset)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
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

      <AssetLibraryPicker
        open={libraryPickerOpen}
        onOpenChange={setLibraryPickerOpen}
        clientId={clientId}
        pageId={pageId}
        existingAssetIds={pageAssets.map(a => a.id)}
        onAssetsLinked={fetchPageAssets}
      />
    </div>
  );
}
