import { useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClient } from "@/contexts/ClientContext";
import { FileText, X } from "lucide-react";
import { UPLOAD_LIMITS } from "@/lib/upload-limits";

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
  onSuccess?: () => void;
}

export function CreateAssetDialog({ open, onOpenChange, folderId, onSuccess }: CreateAssetDialogProps) {
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    type: "link",
    title: "",
    file_url: "",
    tags: "",
  });

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > UPLOAD_LIMITS.ASSET) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${UPLOAD_LIMITS.formatMB(UPLOAD_LIMITS.ASSET)} limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
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

      if (uploadMode === 'file' && selectedFiles.length > 0) {
        let completed = 0;
        
        for (const file of selectedFiles) {
          const assetId = crypto.randomUUID();
          const fileUrl = await uploadFile(file, assetId);
          
          let type: 'image' | 'video' | 'doc' | 'other' = 'other';
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type.startsWith('video/')) type = 'video';
          else if (file.type.includes('pdf') || file.type.includes('document')) type = 'doc';
          
          const { data: assetData, error } = await supabase
            .from("assets")
            .insert([{
              id: assetId,
              client_id: selectedClient.id,
              folder_id: folderId,
              type,
              title: file.name.replace(/\.[^/.]+$/, ""),
              file_url: fileUrl,
              preview_url: type === 'image' ? fileUrl : null,
              storage_type: "upload",
              created_by: user.id,
            }])
            .select()
            .single();

          if (error) throw error;

          if (assetData && (type === 'image' || type === 'video')) {
            supabase.functions.invoke('analyze-asset', {
              body: { asset_id: assetData.id }
            }).catch(() => {
              toast({
                title: "AI Analysis Unavailable",
                description: "Asset uploaded successfully, but AI analysis could not be started.",
                variant: "destructive",
              });
            });
          }

          completed++;
          setUploadProgress((completed / selectedFiles.length) * 100);
        }

        toast({
          title: "Success",
          description: `${selectedFiles.length} file(s) uploaded successfully`,
        });
      } else if (uploadMode === 'url') {
        const tagsArray = formData.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);

        const { error } = await supabase
          .from("assets")
          .insert([{
            client_id: selectedClient.id,
            folder_id: folderId,
            type: formData.type as "image" | "video" | "doc" | "link" | "other",
            title: formData.title,
            file_url: formData.file_url,
            storage_type: "url",
            tags: tagsArray,
            created_by: user.id,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Asset created successfully",
        });
      }

      onOpenChange(false);
      setFormData({ type: "link", title: "", file_url: "", tags: "" });
      setSelectedFiles([]);
      setUploadProgress(0);
      onSuccess?.();
    } catch (error) {
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
              <div>
                <Label htmlFor="fileInput">Select Files</Label>
                <Input
                  id="fileInput"
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  required
                  className="mt-1"
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <Label>Selected Files ({selectedFiles.length})</Label>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-muted-foreground/10 rounded">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <Label>Uploading...</Label>
                  <Progress value={uploadProgress} className="mt-2" />
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedClient}>
              {loading ? "Creating..." : uploadMode === 'file' ? `Upload ${selectedFiles.length || ''} File${selectedFiles.length !== 1 ? 's' : ''}` : "Create Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
