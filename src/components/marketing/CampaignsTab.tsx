import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AddCampaignDialog } from "./AddCampaignDialog";
import { CampaignCard } from "./CampaignCard";
import { CampaignDrawer } from "./CampaignDrawer";

interface Campaign {
  id: string;
  channel_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CampaignsTabProps {
  channelId: string;
  channelName: string;
  isAdminOrFMM: boolean;
}

export function CampaignsTab({ channelId, channelName, isAdminOrFMM }: CampaignsTabProps) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, [channelId]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("marketing_flow_campaigns")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("marketing_flow_campaigns")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign status updated",
      });
      loadCampaigns();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from("marketing_flow_campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted",
      });
      loadCampaigns();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    }
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track individual campaigns and their KPIs separately
        </p>
        {isAdminOrFMM && (
          <AddCampaignDialog
            channelId={channelId}
            channelName={channelName}
            onSuccess={loadCampaigns}
          />
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/5">
          <p className="text-muted-foreground mb-4">
            No campaigns added yet
          </p>
          {isAdminOrFMM && (
            <AddCampaignDialog
              channelId={channelId}
              channelName={channelName}
              onSuccess={loadCampaigns}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => handleCampaignClick(campaign)}
              onStatusChange={(status) => handleStatusChange(campaign.id, status)}
              onDelete={() => handleDelete(campaign.id)}
              isAdminOrFMM={isAdminOrFMM}
            />
          ))}
        </div>
      )}

      {selectedCampaign && (
        <CampaignDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          campaign={selectedCampaign}
          channelName={channelName}
          onUpdate={loadCampaigns}
          isAdminOrFMM={isAdminOrFMM}
        />
      )}
    </div>
  );
}
