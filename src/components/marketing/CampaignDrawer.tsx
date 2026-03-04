import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { CampaignKPIsTab } from "./CampaignKPIsTab";

interface Campaign {
  id: string;
  channel_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CampaignDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  channelName: string;
  onUpdate: () => void;
  isAdminOrFMM: boolean;
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export function CampaignDrawer({ 
  open, 
  onOpenChange, 
  campaign, 
  channelName, 
  onUpdate, 
  isAdminOrFMM 
}: CampaignDrawerProps) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || "");
  const [status, setStatus] = useState(campaign.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setStatus(campaign.status);
    }
  }, [open, campaign]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("marketing_flow_campaigns")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success("Success", { description: "Campaign updated successfully" });
      onUpdate();
    } catch (error) {
      toast.error("Error", { description: "Failed to update campaign" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete associated KPIs first (cascading should handle this, but be safe)
      await supabase
        .from("channel_weekly_kpis")
        .delete()
        .eq("campaign_id", campaign.id);

      // Delete the campaign
      const { error } = await supabase
        .from("marketing_flow_campaigns")
        .delete()
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success("Success", { description: "Campaign deleted successfully" });
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      toast.error("Error", { description: "Failed to delete campaign" });
    } finally {
      setDeleting(false);
    }
  };

  const statusConfig: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {campaign.name}
            <Badge className={statusConfig[campaign.status]}>
              {campaign.status}
            </Badge>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{channelName} Campaign</p>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="kpis">KPIs</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdminOrFMM}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-description">Description</Label>
              <Textarea
                id="campaign-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isAdminOrFMM}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={!isAdminOrFMM}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Created: {new Date(campaign.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(campaign.updated_at).toLocaleDateString()}</p>
            </div>

            {isAdminOrFMM && (
              <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            )}
          </TabsContent>

          <TabsContent value="kpis" className="mt-4">
            <CampaignKPIsTab
              campaignId={campaign.id}
              channelId={campaign.channel_id}
              channelName={channelName}
              isAdminOrFMM={isAdminOrFMM}
            />
          </TabsContent>
        </Tabs>

        {isAdminOrFMM && (
          <div className="flex justify-end mt-6 pt-6 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Campaign
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{campaign.name}" and all its associated KPI data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
