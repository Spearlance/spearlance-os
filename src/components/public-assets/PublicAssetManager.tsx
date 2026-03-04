import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Grid, List, FolderPlus, Upload, ChevronRight, Home, Search, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicFolderCard } from "./PublicFolderCard";
import { PublicAssetCard } from "./PublicAssetCard";
import { PublicUploadDialog } from "./PublicUploadDialog";
import { PublicCreateFolderDialog } from "./PublicCreateFolderDialog";
import { toast } from "sonner";
import spearlanceLogo from "@/assets/spearlance-logo-white.png";

interface Folder {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
}

interface Asset {
  id: string;
  title: string;
  type: string;
  file_url: string;
  preview_url: string | null;
  tags: string[];
  created_at: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

interface PublicAssetManagerProps {
  sessionToken: string;
  clientName: string;
}

export function PublicAssetManager({ sessionToken, clientName }: PublicAssetManagerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const apiCall = useCallback(async (action: string, options?: { method?: string; body?: unknown; params?: Record<string, string> }) => {
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-assets-api`);
    url.searchParams.set('action', action);
    
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: options?.method || 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  }, [sessionToken]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [foldersData, assetsData, breadcrumbsData] = await Promise.all([
        apiCall('list-folders', { params: { parent_id: currentFolderId || '' } }),
        apiCall('list-assets', { params: { folder_id: currentFolderId || '' } }),
        currentFolderId ? apiCall('get-breadcrumbs', { params: { folder_id: currentFolderId } }) : { breadcrumbs: [] }
      ]);

      setFolders(foldersData.folders || []);
      setAssets(assetsData.assets || []);
      setBreadcrumbs(breadcrumbsData.breadcrumbs || []);
    } catch (error) {
      toast.error("Error", { description: "Failed to load assets" });
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, currentFolderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleLogout = () => {
    // Clear all asset share sessions
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('asset_share_')) {
        sessionStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Open upload dialog with files
      setShowUploadDialog(true);
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="min-h-screen bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={spearlanceLogo} alt="Spearlance" className="h-8 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">{clientName}</h1>
                <p className="text-sm opacity-80">Asset Library</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-primary/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8">
            <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
            <p className="text-lg font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToFolder(null)}
              className="shrink-0"
            >
              <Home className="h-4 w-4" />
            </Button>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center shrink-0">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToFolder(crumb.id)}
                  className={index === breadcrumbs.length - 1 ? "font-semibold" : ""}
                >
                  {crumb.name}
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={() => setShowFolderDialog(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Folder</span>
            </Button>
            
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Folders */}
            {filteredFolders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">Folders</h2>
                <div className={viewMode === "grid" 
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                  : "space-y-2"
                }>
                  {filteredFolders.map((folder) => (
                    <PublicFolderCard
                      key={folder.id}
                      folder={folder}
                      viewMode={viewMode}
                      onClick={() => navigateToFolder(folder.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {filteredAssets.length > 0 ? (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">Files</h2>
                <div className={viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  : "space-y-2"
                }>
                  {filteredAssets.map((asset) => (
                    <PublicAssetCard
                      key={asset.id}
                      asset={asset}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            ) : filteredFolders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No files or folders yet</p>
                <p className="text-sm">Upload files or create a folder to get started</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Dialogs */}
      <PublicUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        sessionToken={sessionToken}
        currentFolderId={currentFolderId}
        onUploadComplete={loadData}
      />

      <PublicCreateFolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        sessionToken={sessionToken}
        currentFolderId={currentFolderId}
        onFolderCreated={loadData}
      />
    </div>
  );
}
