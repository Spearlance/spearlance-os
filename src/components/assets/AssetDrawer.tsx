import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Trash2, FileText, Image as ImageIcon, Link as LinkIcon, FileVideo, FileAudio, Download, Image, Sparkles } from "lucide-react";

interface AssetDrawerProps {
  asset: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AssetDrawer({ asset, open, onOpenChange, onUpdate }: AssetDrawerProps) {
  const [title, setTitle] = useState(asset.title);
  const [type, setType] = useState(asset.type);
  const [fileUrl, setFileUrl] = useState(asset.file_url || "");
  const [tags, setTags] = useState(asset.tags?.join(", ") || "");
  const [aiDescription, setAiDescription] = useState(asset.ai_description || "");
  const { toast } = useToast();

  // Sync local state when asset changes
  useEffect(() => {
    setTitle(asset.title);
    setType(asset.type);
    setFileUrl(asset.file_url || "");
    setTags(asset.tags?.join(", ") || "");
    setAiDescription(asset.ai_description || "");
  }, [asset]);

  const handleSave = async () => {
    const { error } = await supabase
      .from("assets")
      .update({
        title,
        type,
        file_url: fileUrl,
        tags: tags.split(",").map(t => t.trim()).filter(t => t),
        ai_description: aiDescription,
      })
      .eq("id", asset.id);

    if (error) {
      toast({ title: "Error updating asset", variant: "destructive" });
      return;
    }

    toast({ title: "Asset updated successfully" });
    onUpdate();
    onOpenChange(false);
  };

  const handleDownload = async () => {
    if (!fileUrl) return;
    
    if (asset.storage_type === 'upload') {
      try {
        // Fetch the file as a blob to ensure proper download
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        
        // Create object URL and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = title || 'asset';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the object URL
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        toast({ title: "Download failed", variant: "destructive" });
      }
    } else {
      // For external URLs, open in new tab
      window.open(fileUrl, '_blank');
    }
  };

  const handleSetAsFolderCover = async () => {
    if (!asset.folder_id) return;
    
    const { error } = await supabase
      .from('asset_folders')
      .update({ thumbnail_asset_id: asset.id })
      .eq('id', asset.folder_id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to set folder cover",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Folder cover updated",
      });
      onUpdate();
    }
  };

  const handleDelete = async () => {
    try {
      let storageDeleted = true;
      
      // If it's an uploaded file, delete from storage first
      if (asset.storage_type === 'upload' && asset.file_url) {
        const pathMatch = asset.file_url.match(/client-assets\/(.+)$/);
        if (pathMatch) {
          const { error: storageError } = await supabase.storage
            .from('client-assets')
            .remove([pathMatch[1]]);
          
          if (storageError) {
            console.error("Error deleting from storage:", storageError);
            storageDeleted = false;
          }
        }
      }

      // Delete the database record
      const { error: dbError } = await supabase
        .from("assets")
        .delete()
        .eq("id", asset.id);

      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }

      toast({ 
        title: "Asset deleted successfully",
        description: storageDeleted ? undefined : "Note: The file may still exist in storage"
      });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast({ 
        title: "Error deleting asset", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    }
  };

  const getTypeIcon = (assetType: string) => {
    switch (assetType) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <FileVideo className="h-4 w-4" />;
      case "audio":
        return <FileAudio className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] w-full flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Asset Details</SheetTitle>
            <div className="flex gap-2">
              {fileUrl && (
                <>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    {asset.storage_type === 'upload' ? 'Download' : 'Open'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(fileUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="preview" className="mt-6 flex-1 flex flex-col overflow-hidden w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              {asset.preview_url ? (
                <div className="relative w-full max-h-[500px] min-h-[200px] bg-muted rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                  <img
                    src={asset.preview_url}
                    alt={title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center');
                        const icon = document.createElement('div');
                        icon.className = 'text-muted-foreground text-sm';
                        icon.textContent = 'Image not available';
                        e.currentTarget.parentElement.appendChild(icon);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="relative w-full max-h-[500px] min-h-[200px] bg-muted rounded-lg flex items-center justify-center mb-4">
                  {getTypeIcon(asset.type)}
                  <span className="ml-2 text-muted-foreground">No preview available</span>
                </div>
              )}

              <div className="space-y-2">
                {fileUrl && (
                  <Button variant="outline" onClick={handleDownload} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    {asset.storage_type === 'upload' ? 'Download File' : 'Open Link'}
                  </Button>
                )}
                
                {asset.folder_id && (asset.type === 'image' || asset.type === 'video') && (
                  <Button variant="outline" onClick={handleSetAsFolderCover} className="w-full">
                    <Image className="h-4 w-4 mr-2" />
                    Set as Folder Cover
                  </Button>
                )}
              </div>

              <div className="mt-6 text-sm text-muted-foreground space-y-1 pt-4 border-t">
                <div>Created: {new Date(asset.created_at).toLocaleString()}</div>
                {asset.ai_processed_at && (
                  <div>AI Analyzed: {new Date(asset.ai_processed_at).toLocaleString()}</div>
                )}
                {asset.file_url && asset.storage_type === 'upload' && (
                  <div className="text-xs truncate">Path: {asset.file_url}</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="details" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI Description
                  </Label>
                  <Textarea
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="AI-generated description will appear here after analysis..."
                    rows={6}
                    className="resize-none"
                  />
                  {asset.ai_processed_at && (
                    <p className="text-xs text-muted-foreground">
                      Generated: {new Date(asset.ai_processed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-4 sticky bottom-0 bg-background">
                  <Button onClick={handleSave} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this asset? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
