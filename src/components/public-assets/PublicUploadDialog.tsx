import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublicUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionToken: string;
  currentFolderId: string | null;
  onUploadComplete: () => void;
}

interface FileUpload {
  file: File;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export function PublicUploadDialog({ 
  open, 
  onOpenChange, 
  sessionToken, 
  currentFolderId,
  onUploadComplete 
}: PublicUploadDialogProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const apiCall = useCallback(async (action: string, options?: { method?: string; body?: unknown }) => {
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-assets-api`);
    url.searchParams.set('action', action);

    const response = await fetch(url.toString(), {
      method: options?.method || 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API request failed');
    return data;
  }, [sessionToken]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [
      ...prev,
      ...selectedFiles.map(file => ({ file, status: 'pending' as const, progress: 0 }))
    ]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const fileUpload = files[i];
      if (fileUpload.status !== 'pending') continue;

      try {
        // Update status to uploading
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading' as const, progress: 10 } : f
        ));

        // Get signed upload URL
        const { upload_url, file_path } = await apiCall('get-upload-url', {
          method: 'POST',
          body: {
            filename: fileUpload.file.name,
            content_type: fileUpload.file.type,
            folder_id: currentFolderId
          }
        });

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, progress: 30 } : f
        ));

        // Upload file to storage
        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': fileUpload.file.type,
          },
          body: fileUpload.file
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage');
        }

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, progress: 70 } : f
        ));

        // Create asset record
        await apiCall('create-asset', {
          method: 'POST',
          body: {
            title: fileUpload.file.name,
            file_path,
            content_type: fileUpload.file.type,
            folder_id: currentFolderId
          }
        });

        // Mark as complete
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'complete' as const, progress: 100 } : f
        ));
        successCount++;

      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : f
        ));
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast({
        title: "Upload complete",
        description: `${successCount} file(s) uploaded successfully`
      });
      onUploadComplete();
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  const pendingFiles = files.filter(f => f.status === 'pending').length;
  const completedFiles = files.filter(f => f.status === 'complete').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone / file input */}
          <label className="block">
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to select files</p>
              <p className="text-xs text-muted-foreground">or drag and drop</p>
            </div>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>

          {/* File list */}
          {files.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((fileUpload, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileUpload.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {fileUpload.status === 'uploading' && (
                      <Progress value={fileUpload.progress} className="h-1 mt-1" />
                    )}
                    {fileUpload.status === 'error' && (
                      <p className="text-xs text-destructive">{fileUpload.error}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {fileUpload.status === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {fileUpload.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {fileUpload.status === 'complete' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {fileUpload.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {files.length > 0 && (
                <>
                  {completedFiles}/{files.length} uploaded
                </>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {completedFiles === files.length && files.length > 0 ? 'Done' : 'Cancel'}
              </Button>
              {pendingFiles > 0 && (
                <Button onClick={uploadFiles} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${pendingFiles} file(s)`
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
