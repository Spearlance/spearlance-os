import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AccessData } from "@/lib/launchpadTypes";
import { useEffect, useState } from "react";

const accessSchema = z.object({
  ads: z.object({
    meta_business_id: z.string().optional(),
    google_ads_customer_id: z.string().optional(),
    ga_property_id: z.string().optional()
  }),
  domain: z.object({
    provider: z.string().min(1, "Domain provider is required"),
    login_url: z.string().optional(),
    proof_asset_id: z.string().optional()
  }),
  web: z.object({
    platform: z.string().min(1, "Site platform is required"),
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
  reporting: z.object({
    oviond_url: z.string().optional()
  }),
  access_confirmed: z.boolean()
}).refine(
  (data) => data.access_confirmed === true,
  {
    message: "You must confirm you've invited us using the instructions above",
    path: ["access_confirmed"]
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
  onSaveExit,
}: StageAccessProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const form = useForm<AccessData>({
    resolver: zodResolver(accessSchema),
    mode: "onChange",
    defaultValues: initialData || {
      ads: {},
      domain: {
        provider: ""
      },
      web: {
        platform: "Duda"
      },
      crm: {},
      storage: {},
      reporting: {},
      access_confirmed: false
    },
  });

  const getDomainProviderInstructions = (provider: string) => {
    const agencyEmail = import.meta.env.VITE_AGENCY_GOOGLE_EMAIL || 'seo@spearlance.com';
    
    const instructions: Record<string, { steps: string[], showLoginUrl: boolean }> = {
      'GoDaddy': {
        steps: [
          'Log into your GoDaddy account',
          'Go to Account Settings → Delegate Access',
          `Invite ${agencyEmail} as a delegate with 'Products & Domains' access`
        ],
        showLoginUrl: false
      },
      'Google Domains': {
        steps: [
          'Log into domains.google.com',
          'Select your domain',
          'Go to Registration settings → Permissions',
          `Add ${agencyEmail} with 'Owner' or 'Manager' access`
        ],
        showLoginUrl: false
      },
      'Namecheap': {
        steps: [
          'Log into Namecheap',
          'Go to Profile → Tools → Sharing & Transfer',
          'Click "Manage Contacts"',
          `Add ${agencyEmail} with access to your domain`
        ],
        showLoginUrl: false
      },
      'Cloudflare': {
        steps: [
          'Log into Cloudflare dashboard',
          'Select your domain/site',
          'Go to Members → Invite',
          `Enter ${agencyEmail} and select 'DNS Editor' or 'Administrator' role`
        ],
        showLoginUrl: false
      },
      'Squarespace': {
        steps: [
          'Log into Squarespace',
          'Go to Settings → Domains',
          'Click your domain → Advanced Settings → Domain Access',
          `Invite ${agencyEmail} with appropriate permissions`
        ],
        showLoginUrl: false
      },
      'Wix': {
        steps: [
          'Log into Wix dashboard',
          'Go to Settings → Domain',
          'Click "Manage Domain"',
          `Share access with ${agencyEmail}`
        ],
        showLoginUrl: false
      },
      'Shopify': {
        steps: [
          'Log into Shopify admin',
          'Go to Settings → Domains',
          'Click your domain',
          `Transfer or share DNS management with ${agencyEmail}`
        ],
        showLoginUrl: false
      },
      'Bluehost': {
        steps: [
          'Log into Bluehost control panel',
          'Navigate to Domains section',
          'Select domain management',
          `Add ${agencyEmail} as authorized user for domain access`
        ],
        showLoginUrl: false
      },
      'Network Solutions': {
        steps: [
          'Log into Network Solutions account',
          'Go to My Domain Names',
          'Select Access Control',
          `Add ${agencyEmail} with domain management permissions`
        ],
        showLoginUrl: false
      },
      'Other': {
        steps: [
          `Please provide the login URL below and invite ${agencyEmail} with DNS or domain management access`,
          'Take a screenshot of the invitation confirmation'
        ],
        showLoginUrl: true
      }
    };
    
    return instructions[provider] || instructions['Other'];
  };

  const saveData = async (data: AccessData) => {
    setSaveStatus("saving");
    try {
      const { data: submissionData } = await supabase
        .from("launchpad_submissions")
        .select("responses_json, client_id")
        .eq("id", submissionId)
        .single();

      if (!submissionData) throw new Error("Submission not found");

      const updatedResponses = {
        ...(submissionData.responses_json as Record<string, any> || {}),
        access: data,
      };

      await supabase
        .from("launchpad_submissions")
        .update({ responses_json: updatedResponses as any })
        .eq("id", submissionId);

      // Mirror URLs to clients table
      const clientUpdates: Record<string, any> = {};
      
      if (data.storage?.drive_folder_url) {
        const { data: client } = await supabase
          .from("clients")
          .select("drive_folder_url")
          .eq("id", submissionData.client_id)
          .single();
        
        if (client && !client.drive_folder_url) {
          clientUpdates.drive_folder_url = data.storage.drive_folder_url;
        }
      }

      if (data.storage?.canva_folder_url) {
        const { data: client } = await supabase
          .from("clients")
          .select("canva_folder_url")
          .eq("id", submissionData.client_id)
          .single();
        
        if (client && !client.canva_folder_url) {
          clientUpdates.canva_folder_url = data.storage.canva_folder_url;
        }
      }

      if (data.reporting?.oviond_url) {
        const { data: client } = await supabase
          .from("clients")
          .select("oviond_url")
          .eq("id", submissionData.client_id)
          .single();
        
        if (client && !client.oviond_url) {
          clientUpdates.oviond_url = data.reporting.oviond_url;
        }
      }

      if (Object.keys(clientUpdates).length > 0) {
        await supabase
          .from("clients")
          .update(clientUpdates)
          .eq("id", submissionData.client_id);
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving access data:", error);
      toast({ title: "Error saving data", variant: "destructive" });
      setSaveStatus("idle");
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    try {
      const { data: submissionData } = await supabase
        .from("launchpad_submissions")
        .select("client_id")
        .eq("id", submissionId)
        .single();

      if (!submissionData) throw new Error("Submission not found");

      const fileExt = file.name.split(".").pop();
      const fileName = `${submissionId}_domain_proof_${Date.now()}.${fileExt}`;
      const filePath = `${submissionData.client_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("client-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("client-assets")
        .getPublicUrl(filePath);

      const { data: user } = await supabase.auth.getUser();

      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .insert([{
          client_id: submissionData.client_id,
          title: `Domain Access Proof - ${file.name}`,
          type: "link",
          storage_type: "upload",
          file_url: publicUrl,
          tags: ["Launch Pad Upload", "Access Proof"],
          created_by: user?.user?.id,
        }])
        .select()
        .single();

      if (assetError) throw assetError;

      const { error: versionError } = await supabase
        .from("asset_versions")
        .insert({
          asset_id: asset.id,
          version_number: 1,
          file_url: publicUrl,
          created_by: user?.user?.id,
        });

      if (versionError) throw versionError;

      form.setValue('domain.proof_asset_id', asset.id);
      toast({ title: "Screenshot uploaded successfully" });
    } catch (error) {
      console.error("Error uploading screenshot:", error);
      toast({ title: "Error uploading screenshot", variant: "destructive" });
    }
  };

  const handleContinue = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const formData = form.getValues();
      await saveData(formData);

      const { data: submissionData } = await supabase
        .from("launchpad_submissions")
        .select("completed_at")
        .eq("id", submissionId)
        .single();

      await supabase
        .from("launchpad_submissions")
        .update({
          stage: "assets",
          completed_at: { 
            ...((submissionData?.completed_at as Record<string, any>) || {}), 
            access: new Date().toISOString() 
          } as any,
        })
        .eq("id", submissionId);

      onContinue();
    } catch (error) {
      console.error("Error continuing:", error);
      toast({ title: "Error advancing to next stage", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExit = async () => {
    const formData = form.getValues();
    await saveData(formData);
    onSaveExit();
  };

  useEffect(() => {
    const subscription = form.watch((value) => {
      const timer = setTimeout(() => {
        saveData(value as AccessData);
      }, 500);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Access Details</h2>
        <p className="text-muted-foreground mt-1">
          Provide access credentials so we can start working on your campaigns.
        </p>
      </div>

      <form className="space-y-8 bg-card p-6 rounded-lg border">
        {/* Ad & Analytics */}
        <div className="space-y-4">
          <h3 className="font-semibold">Ad & Analytics</h3>
          
          {/* Meta Business ID */}
          <div>
            <Label htmlFor="meta_business_id">
              Meta (Facebook/Instagram) Business ID
            </Label>
            <Input 
              id="meta_business_id" 
              placeholder="123456789012345"
              {...form.register("ads.meta_business_id")}
            />
            <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
              <p>
                Go to <a href="https://business.facebook.com/settings/info" target="_blank" rel="noopener noreferrer" className="text-[#13cf48] hover:underline">business.facebook.com/settings/info</a> and copy your Business ID number. Paste it here so we can request access to your ad account, pixel, and pages.
              </p>
              <p>
                Then go to <span className="font-medium">Business Settings → Users → Partners → Add</span>.
              </p>
              <p>
                Enter our Business ID: <span className="font-mono font-medium">{import.meta.env.VITE_AGENCY_META_BUSINESS_ID || '[AGENCY_META_BUSINESS_ID]'}</span> and grant access to Ad Accounts, Pages, and Pixels.
              </p>
            </div>
          </div>
          
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
              You can find this at the top right of your Google Ads dashboard, formatted like 123-456-7890. We'll send an invite from our account once provided.
            </p>
          </div>
          
          {/* Google Analytics Property ID */}
          <div>
            <Label htmlFor="ga_property_id">
              Google Analytics Property ID
            </Label>
            <Input 
              id="ga_property_id" 
              placeholder="G-XXXXXXXXX"
              {...form.register("ads.ga_property_id")}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Enter your GA4 Property ID (looks like G-XXXXXXX).
            </p>
          </div>
          
          {/* Domain Provider Access */}
          <div className="border rounded-md p-4 bg-muted/20">
            <div className="space-y-4">
              <div>
                <Label htmlFor="domain_provider" className="text-sm font-semibold">
                  Where did you purchase your domain? *
                </Label>
                <Select 
                  value={form.watch("domain.provider")} 
                  onValueChange={(value) => form.setValue("domain.provider", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select domain provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GoDaddy">GoDaddy</SelectItem>
                    <SelectItem value="Google Domains">Google Domains</SelectItem>
                    <SelectItem value="Namecheap">Namecheap</SelectItem>
                    <SelectItem value="Cloudflare">Cloudflare</SelectItem>
                    <SelectItem value="Squarespace">Squarespace</SelectItem>
                    <SelectItem value="Wix">Wix</SelectItem>
                    <SelectItem value="Shopify">Shopify</SelectItem>
                    <SelectItem value="Bluehost">Bluehost</SelectItem>
                    <SelectItem value="Network Solutions">Network Solutions</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.domain?.provider && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.domain.provider.message}
                  </p>
                )}
              </div>
              
              {/* Dynamic Instructions */}
              {form.watch("domain.provider") && (
                <div className="space-y-3 pt-2">
                  <div className="text-sm space-y-2">
                    <p className="font-medium">Follow these steps:</p>
                    <ol className="list-decimal list-inside space-y-1.5 ml-2">
                      {getDomainProviderInstructions(form.watch("domain.provider")).steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  
                  {/* Conditional Domain Login URL */}
                  {getDomainProviderInstructions(form.watch("domain.provider")).showLoginUrl && (
                    <div>
                      <Label htmlFor="domain_login_url" className="text-sm">
                        Domain Login URL
                      </Label>
                      <Input
                        id="domain_login_url"
                        placeholder="https://my.hostingprovider.com"
                        {...form.register("domain.login_url")}
                        className="mt-1.5"
                      />
                    </div>
                  )}
                  
                  {/* Screenshot Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="domain_screenshot" className="text-sm">
                      Upload proof screenshot (optional)
                    </Label>
                    <Input
                      id="domain_screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleScreenshotUpload(file);
                      }}
                    />
                    {form.watch("domain.proof_asset_id") && (
                      <p className="text-xs text-[#13cf48]">✓ Screenshot uploaded</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Website & CRM */}
        <div className="space-y-4">
          <h3 className="font-semibold">Website & CRM</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform">Where is your website currently hosted? *</Label>
              <Select 
                value={form.watch("web.platform")} 
                onValueChange={(value) => form.setValue("web.platform", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Duda">Duda</SelectItem>
                  <SelectItem value="WordPress">WordPress</SelectItem>
                  <SelectItem value="Webflow">Webflow</SelectItem>
                  <SelectItem value="Shopify">Shopify</SelectItem>
                  <SelectItem value="Squarespace">Squarespace</SelectItem>
                  <SelectItem value="Wix">Wix</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Select the platform your site is currently built on so we can request access.
              </p>
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
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter your site's admin URL so we know where to log in after access is granted.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="crm_name">Which CRM or system do you use to manage leads?</Label>
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
              <p className="text-xs text-muted-foreground mt-1.5">
                Paste your shared marketing folder link if you already have one. We'll use it for shared assets.
              </p>
            </div>
            <div>
              <Label htmlFor="canva_folder_url">Canva Folder URL</Label>
              <Input 
                id="canva_folder_url" 
                placeholder="https://www.canva.com/..."
                {...form.register("storage.canva_folder_url")}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Paste your shared Canva folder link if applicable.
              </p>
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
              If you already have an Oviond dashboard, share it here. Otherwise, we'll create one for you and connect your data.
            </p>
          </div>
        </div>
        
        {/* Access Confirmation Checkbox */}
        <div className="flex items-start space-x-2 p-3 bg-muted/30 rounded-md">
          <Checkbox 
            id="access_confirmed" 
            checked={form.watch("access_confirmed")}
            onCheckedChange={(checked) => form.setValue("access_confirmed", checked as boolean)}
          />
          <div className="space-y-1">
            <Label htmlFor="access_confirmed" className="cursor-pointer font-normal">
              I have invited seo@spearlance.com to my website platform and domain provider using the instructions above. *
            </Label>
            {form.formState.errors.access_confirmed && (
              <p className="text-xs text-destructive">
                {form.formState.errors.access_confirmed.message}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Save Status */}
      {saveStatus !== "idle" && (
        <div className="text-sm text-center text-muted-foreground">
          {saveStatus === "saving" ? "Saving..." : "Saved ✓"}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveExit}>
            Save & Exit
          </Button>
          <Button 
            onClick={handleContinue} 
            disabled={!form.formState.isValid || saving}
            className="bg-[#13cf48] hover:bg-[#13cf48]/90"
          >
            {saving ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
