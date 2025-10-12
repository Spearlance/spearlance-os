import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import { Upload, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export function StageAssets({ submissionId, onContinue, onBack, onSaveExit }: StageAssetsProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [headlines, setHeadlines] = useState("");
  const [imageRightsAck, setImageRightsAck] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, category: "Brand" | "Creative") => {
    if (!selectedClient) return null;

    try {
      // Validate file type
      const allowedTypes = category === "Brand" 
        ? ["image/png", "image/jpeg", "image/svg+xml", "application/pdf", "application/zip"]
        : ["image/png", "image/jpeg", "image/jpg"];

      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid file type", variant: "destructive" });
        return null;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large (max 10MB)", variant: "destructive" });
        return null;
      }

      const filePath = `${selectedClient.id}/launchpad/${category.toLowerCase()}/${Date.now()}-${file.name}`;
      
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
      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .insert({
          client_id: selectedClient.id,
          title: file.name,
          storage_type: "upload",
          file_url: urlData.publicUrl,
          tags: ["Launch Pad Upload", category],
          created_by: user?.id,
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

      return { id: asset.id, name: file.name, category };
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Error uploading file", variant: "destructive" });
      return null;
    }
  };

  const handleFileUpload = async (files: FileList | null, category: "Brand" | "Creative") => {
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
    }
  };

  const removeFile = async (fileId: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
  };

  const handleContinue = async () => {
    // Validate: Logo required
    const hasLogo = uploadedFiles.some((f) => f.category === "Brand" && f.name.toLowerCase().includes("logo"));
    if (!hasLogo) {
      toast({ title: "Logo upload required", variant: "destructive" });
      return;
    }

    // Validate: If creative uploads exist, rights acknowledgment required
    const hasCreative = uploadedFiles.some((f) => f.category === "Creative");
    if (hasCreative && !imageRightsAck) {
      toast({ title: "Please acknowledge image rights", variant: "destructive" });
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

      // Update with asset IDs
      const { error } = await supabase
        .from("launchpad_submissions")
        .update({
          responses_json: {
            ...(submissionData?.responses_json || {}),
            assets: { ids: uploadedFiles.map((f) => f.id) },
          } as any,
          stage: "avatar",
          completed_at: { ...(submissionData?.completed_at || {}), assets: new Date().toISOString() } as any,
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

  const hasLogo = uploadedFiles.some((f) => f.category === "Brand");
  const hasCreative = uploadedFiles.some((f) => f.category === "Creative");
  const canContinue = hasLogo && (!hasCreative || imageRightsAck);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Assets Stage</h2>
            <p className="text-sm text-muted-foreground">
              Upload your brand materials, logos, and marketing assets. These will be used to maintain brand consistency.
            </p>
          </div>
        </div>

        <div className="space-y-8 bg-card p-6 rounded-lg border">
          {/* Brand Kit */}
          <div className="space-y-4">
            <h3 className="font-semibold">Brand Kit</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo">Logo Upload * (PNG, JPG, SVG - Max 10MB)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:border-[#13cf48] transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <Label htmlFor="logo" className="cursor-pointer text-sm text-[#13cf48] hover:underline">
                    Click to upload logo
                  </Label>
                  <input
                    id="logo"
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, "Brand")}
                    disabled={uploading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="brand_guide">Brand Guide (PDF)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center hover:border-[#13cf48] transition-colors">
                  <Label htmlFor="brand_guide" className="cursor-pointer text-sm text-muted-foreground hover:text-[#13cf48]">
                    Upload brand guide
                  </Label>
                  <input
                    id="brand_guide"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, "Brand")}
                    disabled={uploading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fonts">Fonts (ZIP)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center hover:border-[#13cf48] transition-colors">
                  <Label htmlFor="fonts" className="cursor-pointer text-sm text-muted-foreground hover:text-[#13cf48]">
                    Upload fonts
                  </Label>
                  <input
                    id="fonts"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, "Brand")}
                    disabled={uploading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Creative & Copy */}
          <div className="space-y-4">
            <h3 className="font-semibold">Creative & Copy</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="past_ads">Past Ads (PNG, JPG - Multiple files)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:border-[#13cf48] transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <Label htmlFor="past_ads" className="cursor-pointer text-sm text-muted-foreground hover:text-[#13cf48]">
                    Upload creative assets
                  </Label>
                  <input
                    id="past_ads"
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, "Creative")}
                    disabled={uploading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="headlines">Existing Headlines or Scripts</Label>
                <Textarea
                  id="headlines"
                  rows={4}
                  placeholder="Paste any existing ad copy, headlines, or scripts..."
                  value={headlines}
                  onChange={(e) => setHeadlines(e.target.value)}
                />
              </div>

              {hasCreative && (
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="image_rights"
                    checked={imageRightsAck}
                    onCheckedChange={(checked) => setImageRightsAck(checked as boolean)}
                  />
                  <Label htmlFor="image_rights" className="cursor-pointer">
                    I confirm I have the rights to use these creative assets *
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Uploaded Files</h4>
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
          className="bg-[#13cf48] hover:bg-[#10b93d] text-white"
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
