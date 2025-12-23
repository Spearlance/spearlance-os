import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface UploadSEOReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function UploadSEOReportDialog({ open, onOpenChange, clientId }: UploadSEOReportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('client_id', clientId);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-seo-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process report');
      }

      toast({
        title: "Report uploaded successfully",
        description: `Imported ${result.keywords_count} keywords from ${result.region}`,
      });

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['seo-reports'] });
      queryClient.invalidateQueries({ queryKey: ['seo-keywords'] });

      setFile(null);
      onOpenChange(false);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process the report",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload SE Ranking Keywords</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv">SE Ranking Positions CSV</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV files only
                  </p>
                </label>
              )}
              <Input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">How to export from SE Ranking:</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>Go to Rankings → Detailed in SE Ranking</li>
              <li>Click the Export button and select CSV</li>
              <li>Upload the downloaded file here</li>
            </ol>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
