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
    google_ads_id: z.string().optional(),
    meta_bm_url: z.string().optional()
  }),
  analytics: z.object({
    ga_property_id: z.string().optional(),
    gsc_property_url: z.string().optional()
  }),
  web: z.object({
    platform: z.string().min(1, "Required"),
    admin_url: z.string().optional()
  }),
  crm: z.object({
    name: z.string().optional(),
    url: z.string().optional()
  }),
  storage: z.object({
    drive_folder_url: z.string().optional(),
    canva_folder_url: z.string().optional()
  }),
  consent: z.object({
    ack_shared_access: z.boolean().refine(val => val === true, "You must acknowledge")
  })
});
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
      ads: {},
      analytics: {},
      web: {
        platform: ""
      },
      crm: {},
      storage: {},
      consent: {
        ack_shared_access: false
      }
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
        if (Object.keys(updates).length > 0) {
          const {
            data: clientData
          } = await supabase.from("clients").select("drive_folder_url, canva_folder_url").eq("id", selectedClient.id).single();

          // Only update if fields are empty
          const finalUpdates: any = {};
          if (updates.drive_folder_url && !clientData?.drive_folder_url) finalUpdates.drive_folder_url = updates.drive_folder_url;
          if (updates.canva_folder_url && !clientData?.canva_folder_url) finalUpdates.canva_folder_url = updates.canva_folder_url;
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
              Connect your ad accounts, analytics, and marketing platforms. This allows us to integrate with your existing tools.
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
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="google_ads_id">Google Ads Account ID</Label>
                <Input id="google_ads_id" placeholder="123-456-7890" {...form.register("ads.google_ads_id")} />
              </div>
              <div>
                <Label htmlFor="meta_bm_url">Meta Ads Business Manager URL</Label>
                <Input id="meta_bm_url" placeholder="https://business.facebook.com/..." {...form.register("ads.meta_bm_url")} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ga_property_id">Google Analytics Property ID</Label>
                <Input id="ga_property_id" placeholder="G-XXXXXXXXXX" {...form.register("analytics.ga_property_id")} />
              </div>
              <div>
                <Label htmlFor="gsc_property_url">Google Search Console URL</Label>
                <Input id="gsc_property_url" placeholder="https://example.com" {...form.register("analytics.gsc_property_url")} />
              </div>
            </div>
          </div>

          {/* Website & CRM */}
          <div className="space-y-4">
            <h3 className="font-semibold">Website & CRM</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="platform">Site Platform *</Label>
                <Select value={form.watch("web.platform")} onValueChange={value => form.setValue("web.platform", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Duda">Duda</SelectItem>
                    <SelectItem value="WordPress">WordPress</SelectItem>
                    <SelectItem value="Webflow">Webflow</SelectItem>
                    <SelectItem value="Shopify">Shopify</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.web?.platform && <p className="text-xs text-destructive mt-1">{form.formState.errors.web.platform.message}</p>}
              </div>
              <div>
                <Label htmlFor="admin_url">Admin URL</Label>
                <Input id="admin_url" placeholder="https://admin.example.com" {...form.register("web.admin_url")} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crm_name">CRM Name</Label>
                <Select value={form.watch("crm.name")} onValueChange={value => form.setValue("crm.name", value)}>
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
                <Input id="crm_url" placeholder="https://crm.example.com" {...form.register("crm.url")} />
              </div>
            </div>
          </div>

          {/* Storage & Design */}
          <div className="space-y-4">
            <h3 className="font-semibold">Storage & Design</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="drive_folder_url">Google Drive Marketing Folder URL</Label>
                <Input id="drive_folder_url" placeholder="https://drive.google.com/..." {...form.register("storage.drive_folder_url")} />
              </div>
              <div>
                <Label htmlFor="canva_folder_url">Canva Folder URL (Optional)</Label>
                <Input id="canva_folder_url" placeholder="https://www.canva.com/..." {...form.register("storage.canva_folder_url")} />
              </div>
            </div>
          </div>

          {/* Reporting */}
          

          {/* Security & Consent */}
          <div className="space-y-4">
            <h3 className="font-semibold">Security & Consent</h3>
            <div className="flex items-start space-x-2">
              <Checkbox id="ack_shared_access" checked={form.watch("consent.ack_shared_access")} onCheckedChange={checked => form.setValue("consent.ack_shared_access", checked as boolean)} />
              <div className="space-y-1">
                <Label htmlFor="ack_shared_access" className="cursor-pointer">
                  I confirm I have authority to share these access details for the purpose of marketing services *
                </Label>
                {form.formState.errors.consent?.ack_shared_access && <p className="text-xs text-destructive">{form.formState.errors.consent.ack_shared_access.message}</p>}
              </div>
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