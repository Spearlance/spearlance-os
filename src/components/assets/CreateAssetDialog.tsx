import { useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateAssetDialog({ open, onOpenChange, onSuccess }: CreateAssetDialogProps) {
  const { toast } = useToast();
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    type: "link",
    title: "",
    file_url: "",
    tags: "",
  });

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Auto-detect type from MIME
    if (file.type.startsWith('image/')) {
      setFormData({ ...formData, type: 'image' });
    } else if (file.type.startsWith('video/')) {
      setFormData({ ...formData, type: 'video' });
    } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('sheet')) {
      setFormData({ ...formData, type: 'doc' });
    }

    // Auto-fill title from filename if empty
    if (!formData.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setFormData({ ...formData, title: nameWithoutExt });
    }
  };

  const uploadFile = async (file: File, assetId: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${selectedClient!.id}/${assetId}/original.${fileExt}`;

    const { error } = await supabase.storage
      .from('client-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('client-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const tagsArray = formData.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Generate asset ID first
      const assetId = crypto.randomUUID();
      let fileUrl = formData.file_url;
      let storageType: "url" | "upload" = "url";

      // Handle file upload
      if (uploadMode === 'file' && selectedFile) {
        setUploadProgress(30);
        fileUrl = await uploadFile(selectedFile, assetId);
        storageType = "upload";
        setUploadProgress(70);
      }

      // Insert asset record
      const { error } = await supabase
        .from("assets")
        .insert([{
          id: assetId,
          client_id: selectedClient.id,
          type: formData.type as "image" | "video" | "doc" | "link" | "other",
          title: formData.title,
          file_url: fileUrl,
          storage_type: storageType,
          tags: tagsArray,
          created_by: user.id,
        }]);

      if (error) throw error;
      
      setUploadProgress(100);

      toast({
        title: "Success",
        description: uploadMode === 'file' ? "File uploaded successfully" : "Asset created successfully",
      });

      onOpenChange(false);
      setFormData({ type: "link", title: "", file_url: "", tags: "" });
      setSelectedFile(null);
      setUploadProgress(0);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating asset:", error);
      toast({
        title: "Error",
        description: "Failed to create asset",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload Mode Toggle */}
          <div>
            <Label>Upload Method</Label>
            <RadioGroup value={uploadMode} onValueChange={(value: 'file' | 'url') => setUploadMode(value)} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="file" id="file" />
                <Label htmlFor="file" className="font-normal cursor-pointer">Upload File</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url" className="font-normal cursor-pointer">External URL</Label>
              </div>
            </RadioGroup>
          </div>

          {uploadMode === 'file' ? (
            <>
              {/* File Upload Section */}
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  required
                  className="mt-1"
                />
                {selectedFile && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {/* Image Preview */}
              {selectedFile && selectedFile.type.startsWith('image/') && (
                <div className="mt-2">
                  <Label>Preview</Label>
                  <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="Preview" 
                    className="mt-2 max-h-48 rounded-lg border object-contain w-full"
                  />
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <Label>Uploading...</Label>
                  <Progress value={uploadProgress} className="mt-2" />
                </div>
              )}
            </>
          ) : (
            <>
              {/* External URL Section */}
              <div>
                <Label htmlFor="file_url">URL</Label>
                <Input
                  id="file_url"
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://example.com/asset.pdf"
                  required
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="doc">Document</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Asset title"
              required
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="design, logo, brand"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedClient}>
              {loading ? "Creating..." : "Upload Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
