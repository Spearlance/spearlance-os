import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChannelManagementCard } from "./ChannelManagementCard";
import { AddChannelDialog } from "@/components/marketing/AddChannelDialog";
import { EditChannelDialog } from "./EditChannelDialog";
import type { Database } from "@/integrations/supabase/types";

type Stage = Database["public"]["Tables"]["marketing_flow_stages"]["Row"] & {
  channelCount?: number;
};

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"] & {
  taskCount?: number;
  assignedUserName?: string;
};

export function TaskStageManager() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadStages();
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedStage) {
      loadChannelsForStage(selectedStage.id);
    }
  }, [selectedStage]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setUserRole(profile?.role || "");
    }
  };

  const loadStages = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      // First get or create the marketing flow for this client
      let { data: flow, error: flowError } = await supabase
        .from("marketing_flows")
        .select("id")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      if (flowError) throw flowError;

      // If no flow exists, create one
      if (!flow) {
        const { data: newFlow, error: createFlowError } = await supabase
          .from("marketing_flows")
          .insert({ client_id: selectedClient.id })
          .select()
          .single();

        if (createFlowError) throw createFlowError;
        flow = newFlow;
      }

      // Get all stages for this flow with channel counts
      const { data: stagesData, error: stagesError } = await supabase
        .from("marketing_flow_stages")
        .select(`
          *,
          standard_marketing_stages(name, display_order)
        `)
        .eq("flow_id", flow.id)
        .order("standard_marketing_stages(display_order)");

      if (stagesError) throw stagesError;

      // Get channel counts for each stage
      const stagesWithCounts = await Promise.all(
        (stagesData || []).map(async (stage) => {
          const { count } = await supabase
            .from("marketing_flow_channels")
            .select("*", { count: "exact", head: true })
            .eq("stage_id", stage.id);
          
          return {
            ...stage,
            channelCount: count || 0,
          };
        })
      );

      setStages(stagesWithCounts);
      
      // Auto-select first stage if none selected
      if (!selectedStage && stagesWithCounts.length > 0) {
        setSelectedStage(stagesWithCounts[0]);
      }
    } catch (error) {
      console.error("Error loading stages:", error);
      toast({
        title: "Error",
        description: "Failed to load stages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChannelsForStage = async (stageId: string) => {
    try {
      const { data: channelsData, error } = await supabase
        .from("marketing_flow_channels")
        .select("*")
        .eq("stage_id", stageId)
        .order("created_at");

      if (error) throw error;

      // Get task counts and assigned user names for each channel
      const channelsWithCounts = await Promise.all(
        (channelsData || []).map(async (channel) => {
          const { count } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("linked_channel_id", channel.id);
          
          let assignedUserName = undefined;
          if (channel.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", channel.assigned_to)
              .maybeSingle();
            assignedUserName = profile?.name;
          }
          
          return {
            ...channel,
            taskCount: count || 0,
            assignedUserName,
          };
        })
      );

      setChannels(channelsWithCounts);
    } catch (error) {
      console.error("Error loading channels:", error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    }
  };

  const handleSuccess = () => {
    loadStages();
    if (selectedStage) {
      loadChannelsForStage(selectedStage.id);
    }
  };

  const handleEdit = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (channelId: string, channelName: string, taskCount: number) => {
    if (taskCount > 0) {
      const confirmed = window.confirm(
        `"${channelName}" has ${taskCount} linked task${taskCount === 1 ? '' : 's'}. These tasks will be unlinked but not deleted. Continue?`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(`Delete "${channelName}"?`);
      if (!confirmed) return;
    }

    try {
      // First unlink all tasks
      if (taskCount > 0) {
        const { error: unlinkError } = await supabase
          .from("tasks")
          .update({ linked_channel_id: null })
          .eq("linked_channel_id", channelId);

        if (unlinkError) throw unlinkError;
      }

      // Then delete the channel
      const { error } = await supabase
        .from("marketing_flow_channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });

      handleSuccess();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    }
  };

  const filteredStages = stages.filter((stage) =>
    stage.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdminOrFMM = userRole === "admin" || userRole === "fmm";

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please select a client</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-300px)]">
      {/* Left Rail - Stages */}
      <div className="w-80 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : filteredStages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No stages found</p>
          ) : (
            filteredStages.map((stage) => (
              <Card
                key={stage.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  selectedStage?.id === stage.id ? "border-primary bg-accent" : ""
                }`}
                onClick={() => setSelectedStage(stage)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stage.channelCount || 0} channel{stage.channelCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Right Workspace - Channels */}
      <div className="flex-1 flex flex-col gap-4">
        {selectedStage ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedStage.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Manage channels for this stage
                </p>
              </div>
              {isAdminOrFMM && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {channels.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No channels in this stage</p>
                    {isAdminOrFMM && (
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Channel
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {channels.map((channel) => (
                    <ChannelManagementCard
                      key={channel.id}
                      channel={channel}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      canEdit={isAdminOrFMM}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a stage to view channels</p>
          </div>
        )}
      </div>

      <AddChannelDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        stages={stages}
        selectedStageId={selectedStage?.id}
        onSuccess={handleSuccess}
        selectedClient={selectedClient}
      />

      {selectedChannel && (
        <EditChannelDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          channel={selectedChannel}
          stages={stages}
          onSuccess={handleSuccess}
          selectedClient={selectedClient}
        />
      )}
    </div>
  );
}
