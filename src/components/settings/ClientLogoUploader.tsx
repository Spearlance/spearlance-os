import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, X, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClientLogoUploaderProps {
  clientId: string;
  clientName: string;
  currentLogoUrl?: string;
  onLogoUpdated: (logoUrl: string | null) => void;
}

export function ClientLogoUploader({
  clientId,
  clientName,
  currentLogoUrl,
  onLogoUpdated,
}: ClientLogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, WEBP, or SVG image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${clientId}/logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("client-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("client-assets").getPublicUrl(filePath);

      // Update database
      const { error: updateError } = await supabase
        .from("clients")
        .update({ logo_url: data.publicUrl })
        .eq("id", clientId);

      if (updateError) throw updateError;

      setPreviewUrl(data.publicUrl);
      onLogoUpdated(data.publicUrl);

      toast({
        title: "Logo updated",
        description: "Your logo has been updated successfully",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ logo_url: null })
        .eq("id", clientId);

      if (error) throw error;

      setPreviewUrl(null);
      onLogoUpdated(null);
      
      toast({
        title: "Logo removed",
        description: "Your logo has been removed",
      });
    } catch (error) {
      console.error("Error removing logo:", error);
      toast({
        title: "Error",
        description: "Failed to remove logo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
      <Avatar className="h-24 w-24">
        {previewUrl ? (
          <AvatarImage src={previewUrl} alt={`${clientName} logo`} />
        ) : (
          <AvatarFallback className="bg-primary/10">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => document.getElementById("client-logo-upload")?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : previewUrl ? "Change Logo" : "Upload Logo"}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLogo}
              disabled={isUploading}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WEBP, or SVG. Max 5MB. Recommended: 400x400px
        </p>
        <input
          id="client-logo-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
