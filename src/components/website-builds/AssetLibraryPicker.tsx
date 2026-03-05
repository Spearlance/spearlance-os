import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Folder, Image, Search, Loader2, Check, Home } from 'lucide-react';

interface Asset {
  id: string;
  title: string;
  type: string;
  preview_url: string | null;
  file_url: string | null;
  folder_id: string | null;
}

interface AssetFolder {
  id: string;
  name: string;
  color: string | null;
  parent_folder_id: string | null;
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

interface AssetLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  pageId: string;
  existingAssetIds: string[];
  onAssetsLinked: () => void;
}

export function AssetLibraryPicker({
  open,
  onOpenChange,
  clientId,
  pageId,
  existingAssetIds,
  onAssetsLinked,
}: AssetLibraryPickerProps) {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'All Assets' }]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (open) {
      loadFoldersAndAssets();
    }
  }, [open, currentFolderId, clientId]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: 'All Assets' }]);
      setSelectedAssetIds([]);
      setSearchQuery('');
    }
  }, [open]);

  const loadFoldersAndAssets = async () => {
    setLoading(true);
    try {
      // Load folders
      let folderQuery = supabase
        .from('asset_folders')
        .select('id, name, color, parent_folder_id')
        .eq('client_id', clientId);

      if (currentFolderId) {
        folderQuery = folderQuery.eq('parent_folder_id', currentFolderId);
      } else {
        folderQuery = folderQuery.is('parent_folder_id', null);
      }

      const { data: foldersData } = await folderQuery;
      setFolders(foldersData || []);

      // Load assets (only images for now)
      let assetQuery = supabase
        .from('assets')
        .select('id, title, type, preview_url, file_url, folder_id')
        .eq('client_id', clientId)
        .eq('type', 'image');

      if (currentFolderId) {
        assetQuery = assetQuery.eq('folder_id', currentFolderId);
      } else {
        assetQuery = assetQuery.is('folder_id', null);
      }

      const { data: assetsData } = await assetQuery;
      setAssets(assetsData || []);
    } catch (err) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = async (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: 'All Assets' }]);
    } else {
      setCurrentFolderId(folderId);
      
      // Find index if folder is in breadcrumbs (navigating back)
      const existingIndex = breadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
      }
    }
  };

  const toggleAssetSelection = (assetId: string) => {
    if (existingAssetIds.includes(assetId)) return;
    
    setSelectedAssetIds(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleLinkAssets = async () => {
    if (selectedAssetIds.length === 0) return;
    
    setLinking(true);
    try {
      const inserts = selectedAssetIds.map(assetId => ({
        page_id: pageId,
        asset_id: assetId,
      }));

      const { error } = await supabase
        .from('website_page_assets')
        .insert(inserts);

      if (error) throw error;

      toast.success(`${selectedAssetIds.length} asset(s) added to page`);
      onAssetsLinked();
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to add assets');
    } finally {
      setLinking(false);
    }
  };

  const filteredAssets = searchQuery
    ? assets.filter(a => a.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : assets;

  const filteredFolders = searchQuery
    ? folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folders;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from Asset Library</DialogTitle>
        </DialogHeader>

        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={crumb.id ?? 'root'}>
                {index < breadcrumbs.length - 1 ? (
                  <>
                    <BreadcrumbLink
                      className="cursor-pointer flex items-center gap-1"
                      onClick={() => navigateToFolder(crumb.id, crumb.name)}
                    >
                      {index === 0 && <Home className="h-3 w-3" />}
                      {crumb.name}
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                ) : (
                  <BreadcrumbPage className="flex items-center gap-1">
                    {index === 0 && <Home className="h-3 w-3" />}
                    {crumb.name}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {/* Folders */}
              {filteredFolders.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Folders</p>
                  <div className="grid grid-cols-4 gap-2">
                    {filteredFolders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => navigateToFolder(folder.id, folder.name)}
                        className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                      >
                        <Folder
                          className="h-5 w-5 flex-shrink-0"
                          style={{ color: folder.color || '#6b7280' }}
                        />
                        <span className="text-sm font-medium truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assets */}
              {filteredAssets.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Images</p>
                  <div className="grid grid-cols-4 gap-3">
                    {filteredAssets.map((asset) => {
                      const isAlreadyLinked = existingAssetIds.includes(asset.id);
                      const isSelected = selectedAssetIds.includes(asset.id);
                      const imageUrl = asset.preview_url || asset.file_url;

                      return (
                        <div
                          key={asset.id}
                          onClick={() => toggleAssetSelection(asset.id)}
                          className={`
                            relative rounded-lg border overflow-hidden cursor-pointer transition-all
                            ${isAlreadyLinked ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-primary'}
                            ${isSelected ? 'ring-2 ring-primary' : ''}
                          `}
                        >
                          {/* Image */}
                          <div className="aspect-square bg-muted">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={asset.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{asset.title}</p>
                          </div>

                          {/* Selection indicator */}
                          {!isAlreadyLinked && (
                            <div className="absolute top-2 left-2">
                              <Checkbox
                                checked={isSelected}
                                className="bg-background/80 backdrop-blur-sm"
                              />
                            </div>
                          )}

                          {/* Already linked badge */}
                          {isAlreadyLinked && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Check className="h-3 w-3" />
                                Linked
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                !loading && filteredFolders.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No images in this folder</p>
                  </div>
                )
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedAssetIds.length > 0
                ? `${selectedAssetIds.length} asset(s) selected`
                : 'Select assets to add'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleLinkAssets}
                disabled={selectedAssetIds.length === 0 || linking}
              >
                {linking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add {selectedAssetIds.length > 0 ? selectedAssetIds.length : ''} to Page
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
