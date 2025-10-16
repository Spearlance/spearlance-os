import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import { Upload, FileText, X, Folder, FolderPlus, Home, ChevronRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateFolderDialog } from "@/components/assets/CreateFolderDialog";

interface StageAssetsProps {
  submissionId: string;
  onContinue: () => void;
  onBack: () => void;
  onSaveExit: () => void;
}

interface UploadedFile {
  id: string;
  name: string;
  category: string;
}

interface BrandColors {
  primary: string;
  secondary: string;
  accent1: string;
  accent2: string;
  accent3: string;
}

interface Folder {
  id: string;
  name: string;
  color: string | null;
}

interface Asset {
  id: string;
  title: string;
  type: string;
}

export function StageAssets({ submissionId, onContinue, onBack, onSaveExit }: StageAssetsProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [brandColors, setBrandColors] = useState<BrandColors>({
    primary: "#000000",
    secondary: "#666666",
    accent1: "#13cf48",
    accent2: "#0ea5e9",
    accent3: "#8b5cf6",
  });
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);

  useEffect(() => {
    loadBrandColors();
    loadFolders(null);
    loadAssets(null);
  }, [submissionId, selectedClient]);

  const navigateToFolder = async (folderId: string | null) => {
    setSelectedFolderId(folderId);
    
    // Load current folder details if navigating to a folder
    if (folderId) {
      const { data } = await supabase
        .from("asset_folders")
        .select("id, name, color")
        .eq("id", folderId)
        .single();
      
      setCurrentFolder(data || null);
    } else {
      setCurrentFolder(null);
    }
    
    loadFolders(folderId);
    loadAssets(folderId);
  };

  const navigateToRoot = () => {
    navigateToFolder(null);
  };

  const loadBrandColors = async () => {
    const { data, error } = await supabase
      .from("launchpad_submissions")
      .select("brand_colors")
      .eq("id", submissionId)
      .single();

    if (error) {
      console.error("Error loading brand colors:", error);
      return;
    }

    if (data?.brand_colors) {
      const colors = data.brand_colors as any;
      setBrandColors({
        primary: colors.primary || "#000000",
        secondary: colors.secondary || "#666666",
        accent1: colors.accent1 || "#13cf48",
        accent2: colors.accent2 || "#0ea5e9",
        accent3: colors.accent3 || "#8b5cf6",
      });
    }
  };

  const loadFolders = async (parentId: string | null = null) => {
    if (!selectedClient?.id) return;

    let query = supabase
      .from("asset_folders")
      .select("id, name, color")
      .eq("client_id", selectedClient.id);

    if (parentId === null) {
      query = query.is("parent_folder_id", null);
    } else {
      query = query.eq("parent_folder_id", parentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading folders:", error);
      return;
    }

    setFolders(data || []);
  };

  const loadAssets = async (folderId: string | null = null) => {
    if (!selectedClient?.id) return;

    let query = supabase
      .from("assets")
      .select("id, title, type")
      .eq("client_id", selectedClient.id);

    // Filter by folder_id - null shows root, specific ID shows folder contents
    if (folderId === null) {
      query = query.is("folder_id", null);
    } else {
      query = query.eq("folder_id", folderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading assets:", error);
      return;
    }

    setAssets(data || []);
    
    // Set uploaded files for validation
    const files: UploadedFile[] = data?.map((asset) => ({
      id: asset.id,
      name: asset.title,
      category: asset.type,
    })) || [];
    setUploadedFiles(files);
  };

  const sanitizeFilename = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf(".");
    const name = filename.substring(0, lastDotIndex);
    const ext = filename.substring(lastDotIndex);
    
    const sanitized = name
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    
    return sanitized + ext;
  };

  const uploadFile = async (file: File, category: "logo" | "creative" | "document") => {
    if (!selectedClient) return null;

    try {
      // Validate file type
      const allowedTypes = category === "logo" 
        ? ["image/png", "image/jpeg", "image/svg+xml"]
        : category === "creative"
        ? ["image/png", "image/jpeg", "image/jpg"]
        : ["image/png", "image/jpeg", "image/jpg", "application/pdf"];

      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid file type", variant: "destructive" });
        return null;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large (max 10MB)", variant: "destructive" });
        return null;
      }

      const sanitizedName = sanitizeFilename(file.name);
      const filePath = `${selectedClient.id}/launchpad/${category}/${Date.now()}-${sanitizedName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("client-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("client-assets")
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create asset record
      const assetType = category === "logo" || category === "creative" ? "image" : "doc";
      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .insert({
          client_id: selectedClient.id,
          title: file.name,
          storage_type: "upload",
          file_url: urlData.publicUrl,
          type: assetType,
          tags: ["Launch Pad Upload", category],
          created_by: user?.id,
          folder_id: selectedFolderId,
        })
        .select()
        .single();

      if (assetError) throw assetError;

      // Create asset version
      const { data: version, error: versionError } = await supabase
        .from("asset_versions")
        .insert({
          asset_id: asset.id,
          version_number: 1,
          file_url: urlData.publicUrl,
          created_by: user?.id,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Update current_version_id
      await supabase
        .from("assets")
        .update({ current_version_id: version.id })
        .eq("id", asset.id);

      // If this is a logo upload, sync it to clients.logo_url
      if (category === "logo") {
        await supabase
          .from("clients")
          .update({ logo_url: urlData.publicUrl })
          .eq("id", selectedClient.id);
      }

      return { id: asset.id, name: file.name, category };
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Error uploading file", variant: "destructive" });
      return null;
    }
  };

  const handleFileUpload = async (files: FileList | null, category: "logo" | "creative" | "document") => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploaded: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(files[i], category);
      if (result) uploaded.push(result);
    }

    setUploadedFiles([...uploadedFiles, ...uploaded]);
    setUploading(false);

    if (uploaded.length > 0) {
      toast({ title: `${uploaded.length} file(s) uploaded successfully` });
      loadAssets(selectedFolderId);
    }
  };

  const removeFile = async (fileId: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
  };

  const handleContinue = async () => {
    // Validate: Logo required
    const hasLogo = uploadedFiles.some((f) => f.category === "logo");
    if (!hasLogo) {
      toast({ title: "Logo upload required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Get existing responses_json
      const { data: submissionData } = await supabase
        .from("launchpad_submissions")
        .select("responses_json, completed_at")
        .eq("id", submissionId)
        .single();

      // Update with asset IDs and brand colors
      const { error } = await supabase
        .from("launchpad_submissions")
        .update({
          responses_json: {
            ...((submissionData?.responses_json as Record<string, any>) || {}),
            assets: { ids: uploadedFiles.map((f) => f.id) },
          } as any,
          brand_colors: brandColors as any,
          stage: "avatar",
          completed_at: { ...((submissionData?.completed_at as Record<string, any>) || {}), assets: new Date().toISOString() } as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (error) throw error;

      onContinue();
    } catch (error) {
      console.error("Continue error:", error);
      toast({ title: "Error advancing stage", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasLogo = uploadedFiles.some((f) => f.category === "logo");
  const canContinue = hasLogo;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Assets Stage</h2>
            <p className="text-sm text-muted-foreground">
              Upload your logo, define your brand colors, and upload any creative assets. You can also organize files into folders for easy access later.
            </p>
          </div>
        </div>

        <div className="space-y-8 bg-card p-6 rounded-lg border">
          {/* Brand Kit */}
          <div className="space-y-4">
            <h3 className="font-semibold">Brand Kit</h3>
            <div className="space-y-4">
              {/* Logo Upload */}
              <div>
                <Label htmlFor="logo">Logo Upload * (PNG, JPG, SVG - Max 10MB)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <Label htmlFor="logo" className="cursor-pointer text-sm text-primary hover:underline">
                    Click to upload logo
                  </Label>
                  <input
                    id="logo"
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, "logo")}
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Brand Colors */}
              <div>
                <Label>Brand Colors</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="primary" className="w-32 text-sm">Primary Color</Label>
                    <Input
                      id="primary"
                      type="color"
                      value={brandColors.primary}
                      onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{brandColors.primary}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="secondary" className="w-32 text-sm">Secondary Color</Label>
                    <Input
                      id="secondary"
                      type="color"
                      value={brandColors.secondary}
                      onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{brandColors.secondary}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="accent1" className="w-32 text-sm">Accent Color 1</Label>
                    <Input
                      id="accent1"
                      type="color"
                      value={brandColors.accent1}
                      onChange={(e) => setBrandColors({ ...brandColors, accent1: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{brandColors.accent1}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="accent2" className="w-32 text-sm">Accent Color 2</Label>
                    <Input
                      id="accent2"
                      type="color"
                      value={brandColors.accent2}
                      onChange={(e) => setBrandColors({ ...brandColors, accent2: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{brandColors.accent2}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="accent3" className="w-32 text-sm">Accent Color 3</Label>
                    <Input
                      id="accent3"
                      type="color"
                      value={brandColors.accent3}
                      onChange={(e) => setBrandColors({ ...brandColors, accent3: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{brandColors.accent3}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Creative Assets */}
          <div className="space-y-4">
            <h3 className="font-semibold">Creative Assets</h3>
            <div>
              <Label htmlFor="past_ads">Past Ads (PNG, JPG - Multiple files)</Label>
              <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Label htmlFor="past_ads" className="cursor-pointer text-sm text-muted-foreground hover:text-primary">
                  Upload creative assets
                </Label>
                <input
                  id="past_ads"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, "creative")}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* Organize Your Assets */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Organize Your Assets</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create folders and upload files to stay organized. Don't have everything ready? No problem - you can continue organizing in the Assets tab later.
              </p>
            </div>
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 mb-3 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToRoot}
                disabled={selectedFolderId === null}
                className="h-7"
              >
                <Home className="h-3 w-3 mr-1" />
                Root
              </Button>
              {selectedFolderId && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">
                    {folders.find(f => f.id === selectedFolderId)?.name || 'Folder'}
                  </span>
                </>
              )}
            </div>

            {/* Upload Destination Display */}
            <div className="text-sm p-2 bg-muted rounded mb-2">
              {currentFolder ? (
                <span>
                  📁 Uploading to: <strong>{currentFolder.name}</strong>
                </span>
              ) : (
                <span>📂 Uploading to: <strong>Root folder</strong></span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFolderDialogOpen(true)}
                disabled={uploading}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
              <Label htmlFor="general_upload" className="cursor-pointer">
                <Button variant="outline" asChild disabled={uploading}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </span>
                </Button>
              </Label>
              <input
                id="general_upload"
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, "document")}
                disabled={uploading}
              />
            </div>

            {/* Display folders and assets */}
            {(folders.length > 0 || assets.length > 0) ? (
              <div className="space-y-2 mt-4">
                {folders.map((folder) => (
                  <div 
                    key={folder.id} 
                    onClick={() => navigateToFolder(folder.id)}
                    className="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors bg-muted hover:bg-muted/80"
                  >
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="text-sm">{folder.name}</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                ))}
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{asset.title}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{asset.type}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {selectedFolderId ? "This folder is empty" : "No folders or files yet"}
                </p>
                <p className="text-xs mt-1">
                  {selectedFolderId 
                    ? "Upload files or create subfolders to get started" 
                    : "Create folders and upload files to organize your assets"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Uploaded Files (This Stage)</h4>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">{file.category}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button variant="outline" onClick={onSaveExit}>
            Save & Exit
          </Button>
        </div>
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isSaving || uploading}
          className="bg-primary hover:bg-primary/90"
        >
          Continue →
        </Button>
      </div>

      <CreateFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        parentFolderId={selectedFolderId}
        onSuccess={() => {
          loadFolders(selectedFolderId);
          toast({ title: "Folder created successfully" });
        }}
      />
    </div>
  );
}