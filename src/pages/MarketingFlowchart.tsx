import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus } from "lucide-react";
import { ChannelCard } from "@/components/marketing/ChannelCard";
import { ChannelDrawer } from "@/components/marketing/ChannelDrawer";
import { AddChannelDialog } from "@/components/marketing/AddChannelDialog";
import { ApplyTemplateDialog } from "@/components/marketing/ApplyTemplateDialog";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"] & {
  taskCount?: number;
};
type Stage = Database["public"]["Tables"]["marketing_flow_stages"]["Row"];

const MarketingFlowchart = () => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const isAdminOrFMM = userRole === "admin" || userRole === "fmm";

  useEffect(() => {
    const fetchUserRole = async () => {
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
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (selectedClient?.id) {
      loadFlowData();
    }
  }, [selectedClient]);

  const loadFlowData = async () => {
    if (!selectedClient?.id) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Initialize or get existing flow
      const { data: flowIdData, error: flowError } = await supabase
        .rpc("initialize_marketing_flow", {
          p_client_id: selectedClient.id,
          p_user_id: user.id,
        });

      if (flowError) throw flowError;

      setFlowId(flowIdData);

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("marketing_flow_stages")
        .select("*")
        .eq("flow_id", flowIdData)
        .order("order_index");

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Load channels with task counts
      const { data: channelsData, error: channelsError } = await supabase
        .from("marketing_flow_channels")
        .select("*")
        .in("stage_id", (stagesData || []).map((s) => s.id));

      if (channelsError) throw channelsError;

      // Get task counts for each channel
      const channelsWithCounts = await Promise.all(
        (channelsData || []).map(async (channel) => {
          const { count } = await supabase
            .from("marketing_flow_task_links")
            .select("*", { count: "exact", head: true })
            .eq("channel_id", channel.id);
          
          return { ...channel, taskCount: count || 0 };
        })
      );

      setChannels(channelsWithCounts);
    } catch (error) {
      console.error("Error loading flow data:", error);
      toast({
        title: "Error",
        description: "Failed to load marketing flowchart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getChannelsForStage = (stageId: string) => {
    return channels.filter((c) => c.stage_id === stageId);
  };

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setDrawerOpen(true);
  };

  const handleChannelUpdate = () => {
    loadFlowData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Please select a client</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Marketing Flowchart</h1>
            <p className="text-sm text-gray-600 mt-1">
              A visual roadmap of your marketing system and progress
            </p>
          </div>
          {isAdminOrFMM && (
            <div className="flex gap-2">
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                Apply Template
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Accordion type="multiple" className="space-y-2" defaultValue={stages.map((s) => s.id)}>
          {stages.map((stage) => {
            const stageChannels = getChannelsForStage(stage.id);
            return (
              <AccordionItem
                key={stage.id}
                value={stage.id}
                className="border border-gray-200 rounded-lg bg-white"
              >
                <AccordionTrigger className="px-4 hover:bg-gray-50 rounded-t-lg">
                  <div className="flex items-center justify-between w-full pr-4">
                    <h2 className="text-lg font-semibold text-gray-900">{stage.name}</h2>
                    <span className="text-sm text-gray-500">
                      {stageChannels.length} {stageChannels.length === 1 ? "channel" : "channels"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {stageChannels.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {stageChannels.map((channel) => (
                        <ChannelCard
                          key={channel.id}
                          channel={channel}
                          onClick={() => handleChannelClick(channel)}
                          clientName={selectedClient.name}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No channels yet. {isAdminOrFMM && "Click 'Add Channel' to get started."}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Dialogs */}
      {selectedChannel && (
        <ChannelDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          channel={selectedChannel}
          onUpdate={handleChannelUpdate}
          isAdminOrFMM={isAdminOrFMM}
          clientName={selectedClient.name}
        />
      )}

      {isAdminOrFMM && (
        <>
          <AddChannelDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            stages={stages}
            onSuccess={handleChannelUpdate}
          />
          <ApplyTemplateDialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            stages={stages}
            clientId={selectedClient.id}
            onSuccess={handleChannelUpdate}
          />
        </>
      )}
    </div>
  );
};

export default MarketingFlowchart;
