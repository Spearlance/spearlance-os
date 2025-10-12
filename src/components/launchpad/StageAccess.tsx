import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AccessData } from "@/lib/launchpadTypes";
import { useClient } from "@/contexts/ClientContext";
const accessSchema = z.object({
  ads: z.object({
    meta_business_id: z.string().optional(),
    google_ads_customer_id: z.string().optional(),
    google_analytics_property_id: z.string().optional(),
    search_console_invite_confirmed: z.boolean(),
    search_console_screenshot_asset_id: z.string().optional()
  }),
  web: z.object({
    platform: z.string().min(1, "Site platform is required"),
    admin_url: z.string().optional(),
    runs_meta_ads: z.boolean().optional()
  }),
  crm: z.object({
    name: z.string().optional(),
    url: z.string().optional()
  }),
  storage: z.object({
    drive_folder_url: z.string().optional(),
    canva_folder_url: z.string().optional()
  }),
  reporting: z.object({
    oviond_url: z.string().optional()
  })
}).refine(
  (data) => {
    if (data.web.runs_meta_ads === true) {
      return !!data.ads.meta_business_id && data.ads.meta_business_id.length > 0;
    }
    return true;
  },
  {
    message: "Meta Business ID is required if you run Meta Ads",
    path: ["ads", "meta_business_id"]
  }
).refine(
  (data) => {
    return data.ads.search_console_invite_confirmed === true;
  },
  {
    message: "You must confirm you've invited us to Search Console",
    path: ["ads", "search_console_invite_confirmed"]
  }
);
interface StageAccessProps {
  submissionId: string;
  initialData?: AccessData;
  onContinue: () => void;
  onBack: () => void;
  onSaveExit: () => void;
}
export function StageAccess({
  submissionId,
  initialData,
  onContinue,
  onBack,
  onSaveExit
}: StageAccessProps) {
  const {
    selectedClient
  } = useClient();
  const {
    toast
  } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const form = useForm<AccessData>({
    resolver: zodResolver(accessSchema),
    defaultValues: initialData || {
      ads: {
        search_console_invite_confirmed: false
      },
      web: {
        platform: "Duda",
        runs_meta_ads: undefined
      },
      crm: {},
      storage: {},
      reporting: {}
    }
  });
  const saveData = async (data: AccessData, showToast = false) => {
    setSaveStatus("saving");
    try {
      // Mirror URLs to clients table if not empty
      if (selectedClient) {
        const updates: any = {};
        if (data.storage.drive_folder_url) updates.drive_folder_url = data.storage.drive_folder_url;
        if (data.storage.canva_folder_url) updates.canva_folder_url = data.storage.canva_folder_url;
        if (data.reporting?.oviond_url) updates.oviond_url = data.reporting.oviond_url;
        
        if (Object.keys(updates).length > 0) {
          const {
            data: clientData
          } = await supabase.from("clients").select("drive_folder_url, canva_folder_url, oviond_url").eq("id", selectedClient.id).single();

          // Only update if fields are empty
          const finalUpdates: any = {};
          if (updates.drive_folder_url && !clientData?.drive_folder_url) finalUpdates.drive_folder_url = updates.drive_folder_url;
          if (updates.canva_folder_url && !clientData?.canva_folder_url) finalUpdates.canva_folder_url = updates.canva_folder_url;
          if (updates.oviond_url && !clientData?.oviond_url) finalUpdates.oviond_url = updates.oviond_url;
          
          if (Object.keys(finalUpdates).length > 0) {
            await supabase.from("clients").update(finalUpdates).eq("id", selectedClient.id);
          }
        }
      }

      // Get existing responses_json
      const {
        data: submissionData
      } = await supabase.from("launchpad_submissions").select("responses_json").eq("id", submissionId).single();
      const {
        error
      } = await supabase.from("launchpad_submissions").update({
        responses_json: {
          ...(submissionData?.responses_json as Record<string, any> || {}),
          access: data
        } as any,
        updated_at: new Date().toISOString()
      }).eq("id", submissionId);
      if (error) throw error;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (showToast) {
        toast({
          title: "Progress saved"
        });
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("idle");
      toast({
        title: "Error saving",
        variant: "destructive"
      });
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    if (!selectedClient) return;
    
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Upload to storage
      const timestamp = Date.now();
      const filePath = `${selectedClient.id}/launchpad/access-proof/${timestamp}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('client-assets')
        .getPublicUrl(filePath);
      
      // Create asset record
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          client_id: selectedClient.id,
          title: `Search Console Proof - ${file.name}`,
          storage_type: 'upload',
          file_url: urlData.publicUrl,
          tags: ['Launch Pad Upload', 'Access Proof'],
          created_by: userId
        })
        .select()
        .single();
      
      if (assetError) throw assetError;
      
      // Create asset version
      const { data: version, error: versionError } = await supabase
        .from('asset_versions')
        .insert({
          asset_id: asset.id,
          version_number: 1,
          file_url: urlData.publicUrl,
          created_by: userId
        })
        .select()
        .single();
      
      if (versionError) throw versionError;
      
      // Update current_version_id
      await supabase
        .from('assets')
        .update({ current_version_id: version.id })
        .eq('id', asset.id);
      
      // Update form with asset ID
      form.setValue('ads.search_console_screenshot_asset_id', asset.id);
      
      toast({
        title: "Screenshot uploaded successfully",
        description: "Your proof has been saved."
      });
      
      return asset.id;
    } catch (error) {
      console.error('Screenshot upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleContinue = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    setIsSaving(true);
    try {
      const data = form.getValues();
      await saveData(data);

      // Get current completed_at
      const {
        data: submissionData
      } = await supabase.from("launchpad_submissions").select("completed_at").eq("id", submissionId).single();

      // Advance stage
      const {
        error
      } = await supabase.from("launchpad_submissions").update({
        stage: "assets",
        completed_at: {
          ...(submissionData?.completed_at as Record<string, any> || {}),
          access: new Date().toISOString()
        } as any
      }).eq("id", submissionId);
      if (error) throw error;
      onContinue();
    } catch (error) {
      console.error("Continue error:", error);
      toast({
        title: "Error advancing stage",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  const handleSaveExit = async () => {
    await saveData(form.getValues(), true);
    onSaveExit();
  };

  // Auto-save on blur with debounce
  useEffect(() => {
    const subscription = form.watch(value => {
      const timer = setTimeout(() => {
        if (value) saveData(value as AccessData);
      }, 500);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);
  const isFormValid = form.formState.isValid;
  return <div className="space-y-6">
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Access Stage</h2>
            <p className="text-sm text-muted-foreground">
              Provide functional credentials and invitations so our team can access your advertising and analytics platforms. Follow the instructions carefully for each section.
            </p>
          </div>
          {saveStatus !== "idle" && <p className="text-xs text-muted-foreground">
              {saveStatus === "saving" ? "Saving..." : "Saved ✓"}
            </p>}
        </div>

        <div className="space-y-8 bg-card p-6 rounded-lg border">
          {/* Ad & Analytics */}
          <div className="space-y-4">
            <h3 className="font-semibold">Ad & Analytics</h3>
            
            {/* Meta Ads Toggle */}
            <div className="flex items-start space-x-2 p-3 bg-muted/30 rounded-md">
              <Checkbox 
                id="runs_meta_ads" 
                checked={form.watch("web.runs_meta_ads") === true}
                onCheckedChange={(checked) => form.setValue("web.runs_meta_ads", checked as boolean)}
              />
              <Label htmlFor="runs_meta_ads" className="cursor-pointer font-normal">
                I run Meta (Facebook/Instagram) Ads
              </Label>
            </div>
            
            {/* Conditional Meta Business ID */}
            {form.watch("web.runs_meta_ads") === true && (
              <div>
                <Label htmlFor="meta_business_id">
                  Meta Business ID *
                </Label>
                <Input 
                  id="meta_business_id" 
                  placeholder="123456789012345"
                  {...form.register("ads.meta_business_id")}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Go to <a href="https://business.facebook.com/settings/info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">business.facebook.com/settings/info</a> and copy your Business ID number. Paste it here so we can request access to your ad account, pixel, and pages.
                </p>
                {form.formState.errors.ads?.meta_business_id && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.ads.meta_business_id.message}
                  </p>
                )}
              </div>
            )}
            
            {/* Google Ads Customer ID */}
            <div>
              <Label htmlFor="google_ads_customer_id">
                Google Ads Customer ID
              </Label>
              <Input 
                id="google_ads_customer_id" 
                placeholder="123-456-7890"
                {...form.register("ads.google_ads_customer_id")}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                You can find this at the top right corner of your Google Ads dashboard, usually formatted like 123-456-7890.
              </p>
            </div>
            
            {/* Search Console Access Instructions */}
            <div className="border rounded-md p-4 bg-muted/20">
              <Label className="text-sm font-semibold mb-2 block">
                Search Console Domain Access
              </Label>
              <div className="space-y-3">
                <div className="text-sm space-y-2">
                  <p>We will request access to your website domain in Google Search Console.</p>
                  <p>
                    Please add the following Google account as an <span className="font-semibold">OWNER</span> on your domain property:
                  </p>
                  <div className="bg-background p-2 rounded border font-mono text-xs">
                    {import.meta.env.VITE_AGENCY_GOOGLE_EMAIL || 'marketing@spearlance.com'}
                  </div>
                </div>
                
                {/* Screenshot Upload */}
                <div className="space-y-2">
                  <Label htmlFor="search_console_screenshot" className="text-sm">
                    Upload screenshot (optional)
                  </Label>
                  <Input
                    id="search_console_screenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScreenshotUpload(file);
                    }}
                  />
                  {form.watch("ads.search_console_screenshot_asset_id") && (
                    <p className="text-xs text-primary">✓ Screenshot uploaded</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Google Analytics Property ID */}
            <div>
              <Label htmlFor="google_analytics_property_id">
                Google Analytics Property ID
              </Label>
              <Input 
                id="google_analytics_property_id" 
                placeholder="G-XXXXXXXXX"
                {...form.register("ads.google_analytics_property_id")}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter your GA4 property ID (looks like G-XXXXXXX).
              </p>
            </div>
            
            {/* Confirmation Checkbox */}
            <div className="flex items-start space-x-2 p-3 bg-muted/30 rounded-md">
              <Checkbox 
                id="search_console_invite_confirmed" 
                checked={form.watch("ads.search_console_invite_confirmed")}
                onCheckedChange={(checked) => form.setValue("ads.search_console_invite_confirmed", checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="search_console_invite_confirmed" className="cursor-pointer font-normal">
                  I have invited the agency to my Meta Business Manager and Search Console using the instructions above *
                </Label>
                {form.formState.errors.ads?.search_console_invite_confirmed && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.ads.search_console_invite_confirmed.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Website & CRM */}
          <div className="space-y-4">
            <h3 className="font-semibold">Website & CRM</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="platform">Site Platform *</Label>
                <Select 
                  value={form.watch("web.platform")} 
                  onValueChange={(value) => form.setValue("web.platform", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Duda">Duda (Recommended)</SelectItem>
                    <SelectItem value="WordPress">WordPress</SelectItem>
                    <SelectItem value="Webflow">Webflow</SelectItem>
                    <SelectItem value="Shopify">Shopify</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("web.platform") === "Duda" && (
                  <p className="text-xs text-primary mt-1.5">
                    ✓ We recommend Duda for fastest site updates and full integration with our system.
                  </p>
                )}
                {form.formState.errors.web?.platform && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.web.platform.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="admin_url">Admin URL</Label>
                <Input 
                  id="admin_url" 
                  placeholder="https://admin.example.com"
                  {...form.register("web.admin_url")}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crm_name">CRM Name</Label>
                <Select 
                  value={form.watch("crm.name")} 
                  onValueChange={(value) => form.setValue("crm.name", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CRM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HighLevel">HighLevel</SelectItem>
                    <SelectItem value="HubSpot">HubSpot</SelectItem>
                    <SelectItem value="Salesforce">Salesforce</SelectItem>
                    <SelectItem value="Pipedrive">Pipedrive</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crm_url">CRM URL</Label>
                <Input 
                  id="crm_url" 
                  placeholder="https://crm.example.com"
                  {...form.register("crm.url")}
                />
              </div>
            </div>
          </div>

          {/* Storage & Design */}
          <div className="space-y-4">
            <h3 className="font-semibold">Storage & Design</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="drive_folder_url">Google Drive Marketing Folder URL</Label>
                <Input 
                  id="drive_folder_url" 
                  placeholder="https://drive.google.com/..."
                  {...form.register("storage.drive_folder_url")}
                />
              </div>
              <div>
                <Label htmlFor="canva_folder_url">Canva Folder URL</Label>
                <Input 
                  id="canva_folder_url" 
                  placeholder="https://www.canva.com/..."
                  {...form.register("storage.canva_folder_url")}
                />
              </div>
            </div>
          </div>

          {/* Reporting */}
          <div className="space-y-4">
            <h3 className="font-semibold">Reporting</h3>
            <div>
              <Label htmlFor="oviond_url">Oviond Dashboard URL</Label>
              <Input 
                id="oviond_url" 
                placeholder="https://app.oviond.com/..."
                {...form.register("reporting.oviond_url")}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                If you have an existing Oviond dashboard, share the URL here. Otherwise, we'll set one up for you.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button variant="outline" onClick={handleSaveExit}>
            Save & Exit
          </Button>
        </div>
        <Button onClick={handleContinue} disabled={!isFormValid || isSaving} className="bg-[#13cf48] hover:bg-[#10b93d] text-white">
          Continue →
        </Button>
      </div>
    </div>;
}