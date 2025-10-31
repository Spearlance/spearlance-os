import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, Link as LinkIcon, FileVideo, FileAudio, Upload, FolderPlus, Folder, LayoutGrid, List, Sparkles } from "lucide-react";
import { AssetDrawer } from "@/components/assets/AssetDrawer";
import { CreateAssetDialog } from "@/components/assets/CreateAssetDialog";
import { CreateFolderDialog } from "@/components/assets/CreateFolderDialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
  preview_url: string | null;
  tags: string[];
  created_at: string;
  storage_type: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  thumbnail_asset_id: string | null;
  thumbnail?: {
    id: string;
    file_url: string | null;
    preview_url: string | null;
  };
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

export default function Assets() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createAssetDialogOpen, setCreateAssetDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Root' }]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isBackfilling, setIsBackfilling] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadAssets();
      loadFolders();
    }
  }, [selectedClient, currentFolderId]);

  const loadAssets = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("assets")
      .select("*")
      .eq("client_id", selectedClient.id);

    if (currentFolderId === null) {
      query = query.is("folder_id", null);
    } else {
      query = query.eq("folder_id", currentFolderId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      setAssets(data);
    }
  };

  const loadFolders = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("asset_folders")
      .select(`
        *,
        thumbnail:thumbnail_asset_id(id, file_url, preview_url)
      `)
      .eq("client_id", selectedClient.id);

    if (currentFolderId === null) {
      query = query.is("parent_folder_id", null);
    } else {
      query = query.eq("parent_folder_id", currentFolderId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading folders:", error);
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setFolders(data);
    }
  };

  const navigateToFolder = async (folderId: string | null) => {
    setCurrentFolderId(folderId);
    
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: 'Root' }]);
      return;
    }

    const { data } = await supabase
      .from("asset_folders")
      .select("*")
      .eq("id", folderId)
      .single();

    if (data) {
      const newBreadcrumbs: Breadcrumb[] = [{ id: null, name: 'Root' }];
      let currentFolder = data;
      const folderChain: Breadcrumb[] = [];

      folderChain.unshift({ id: currentFolder.id, name: currentFolder.name });

      while (currentFolder.parent_folder_id) {
        const { data: parentData } = await supabase
          .from("asset_folders")
          .select("*")
          .eq("id", currentFolder.parent_folder_id)
          .single();

        if (parentData) {
          folderChain.unshift({ id: parentData.id, name: parentData.name });
          currentFolder = parentData;
        } else {
          break;
        }
      }

      setBreadcrumbs([...newBreadcrumbs, ...folderChain]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0 || !selectedClient) return;
    
    let successCount = 0;
    
    for (const file of files) {
      try {
        await uploadFile(file);
        successCount++;
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
    
    if (successCount > 0) {
      loadAssets();
      toast({
        title: "Success",
        description: `${successCount} file(s) uploaded successfully`,
      });
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedClient) return;
    
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds 50MB limit`,
        variant: "destructive",
      });
      return;
    }
    
    const assetId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop();
    const filePath = `${selectedClient.id}/${assetId}/original.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('client-assets')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('client-assets')
      .getPublicUrl(filePath);
    
    let type: 'image' | 'video' | 'doc' | 'link' | 'other' | 'copy' = 'other';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.includes('pdf') || file.type.includes('document')) type = 'doc';
    
    const { data: userData } = await supabase.auth.getUser();
    const { data: assetData } = await supabase.from("assets").insert([{
      client_id: selectedClient.id,
      folder_id: currentFolderId,
      title: file.name.replace(/\.[^/.]+$/, ""),
      type,
      storage_type: 'upload',
      file_url: publicUrl,
      created_by: userData.user?.id,
    }]).select().single();
    
    // Trigger AI analysis in background for images and videos
    if (assetData && (type === 'image' || type === 'video')) {
      supabase.functions.invoke('analyze-asset', {
        body: { asset_id: assetData.id }
      }).catch(err => console.error('AI analysis failed:', err));
    }
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
  };

  const handleBackfillEmbeddings = async () => {
    if (!selectedClient) return;
    
    setIsBackfilling(true);
    
    toast({
      title: "Starting AI Analysis",
      description: "Analyzing assets without AI descriptions. This may take a few minutes...",
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('backfill-asset-embeddings', {
        body: { client_id: selectedClient.id }
      });
      
      if (error) throw error;
      
      toast({
        title: "AI Analysis Complete",
        description: `Processed ${data.processed} of ${data.total} assets${data.errors ? ` (${data.errors} errors)` : ''}`,
      });
      
      // Refresh assets to show updated AI descriptions
      loadAssets();
      
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze assets",
        variant: "destructive",
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-5 w-5" />;
      case "video":
        return <FileVideo className="h-5 w-5" />;
      case "audio":
        return <FileAudio className="h-5 w-5" />;
      case "document":
        return <FileText className="h-5 w-5" />;
      default:
        return <LinkIcon className="h-5 w-5" />;
    }
  };

  return (
    <div 
      className="space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assets</h1>
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id || 'root'} className="flex items-center">
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={() => navigateToFolder(crumb.id)}
                      className="cursor-pointer"
                    >
                      {crumb.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        <div className="flex gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}>
            <ToggleGroupItem value="grid">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Button 
            variant="outline"
            onClick={handleBackfillEmbeddings}
            disabled={isBackfilling}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isBackfilling ? "Analyzing..." : "Analyze Missing"}
          </Button>
          
          <Button onClick={() => setCreateFolderDialogOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          
          <Button onClick={() => setCreateAssetDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-primary">
          <div className="text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-2xl font-semibold">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Folders
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => navigateToFolder(folder.id)}
              >
                <CardContent className="p-0">
                  {folder.thumbnail?.file_url || folder.thumbnail?.preview_url ? (
                    <div className="relative">
                      <img
                        src={folder.thumbnail.file_url || folder.thumbnail.preview_url || ''}
                        alt={folder.name}
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 rounded-t-lg" />
                      <Folder className="absolute bottom-2 right-2 h-6 w-6 text-white" />
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center bg-muted rounded-t-lg">
                      <Folder className="h-12 w-12 text-yellow-500" />
                    </div>
                  )}
                  <div className="p-3 text-center">
                    <p className="font-medium text-sm truncate">{folder.name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Assets Section */}
      {assets.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Files
          </h2>
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-2"
          }>
            {assets.map((asset) => (
              <Card
                key={asset.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleAssetClick(asset)}
              >
                <CardHeader className="p-0">
                  {asset.type === 'image' && asset.file_url ? (
                    <img
                      src={asset.file_url}
                      alt={asset.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.classList.add('bg-muted', 'flex', 'items-center', 'justify-center');
                          parent.innerHTML = `<div class="text-muted-foreground">${getTypeIcon(asset.type)}</div>`;
                        }
                      }}
                    />
                  ) : asset.preview_url ? (
                    <img
                      src={asset.preview_url}
                      alt={asset.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.classList.add('bg-muted', 'flex', 'items-center', 'justify-center');
                          parent.innerHTML = `<div class="text-muted-foreground">${getTypeIcon(asset.type)}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      {getTypeIcon(asset.type)}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{asset.title}</CardTitle>
                      <Badge variant="outline">{asset.type}</Badge>
                    </div>
                    
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(asset.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : folders.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Upload className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No assets yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Get started by uploading files or creating folders to organize your assets.
              You can also drag and drop files anywhere on this page.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setCreateFolderDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
              <Button onClick={() => setCreateAssetDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selectedAsset && (
        <AssetDrawer
          asset={selectedAsset}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onUpdate={loadAssets}
        />
      )}

      <CreateAssetDialog
        open={createAssetDialogOpen}
        onOpenChange={setCreateAssetDialogOpen}
        folderId={currentFolderId}
        onSuccess={() => {
          loadAssets();
        }}
      />

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        parentFolderId={currentFolderId}
        onSuccess={() => {
          loadFolders();
        }}
      />
    </div>
  );
}
