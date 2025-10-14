import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { ChannelCard } from "@/components/marketing/ChannelCard";
import { ChannelDrawer } from "@/components/marketing/ChannelDrawer";
import { AddChannelDialog } from "@/components/marketing/AddChannelDialog";
import { ApplyTemplateDialog } from "@/components/marketing/ApplyTemplateDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      
      // Auto-select first stage
      if (stagesData && stagesData.length > 0 && !selectedStage) {
        setSelectedStage(stagesData[0]);
      }

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

  const getChannelCount = (stageId: string) => {
    return channels.filter((c) => c.stage_id === stageId).length;
  };

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setDrawerOpen(true);
  };

  const handleChannelUpdate = () => {
    loadFlowData();
  };

  const filteredStages = stages.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="bg-card border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Marketing Flowchart</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A visual roadmap of your marketing system and progress
          </p>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail */}
        <div className="w-80 border-r bg-muted/10 p-4 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Marketing Stages</h2>

          <Input
            placeholder="Search stages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          <div className="space-y-2">
            {filteredStages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "flex items-center justify-between",
                  selectedStage?.id === stage.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="font-medium">{stage.name}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    selectedStage?.id === stage.id &&
                      "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {getChannelCount(stage.id)}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Right Workspace */}
        <div className="flex-1 p-6 overflow-auto">
          {selectedStage ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{selectedStage.name} Stage</h1>
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

              {getChannelsForStage(selectedStage.id).length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/5">
                  <p className="text-muted-foreground mb-4">
                    No channels in {selectedStage.name} stage yet
                  </p>
                  {isAdminOrFMM && (
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Channel
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getChannelsForStage(selectedStage.id).map((channel) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      onClick={() => handleChannelClick(channel)}
                      clientName={selectedClient.name}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Select a stage to view channels</p>
            </div>
          )}
        </div>
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
            selectedStageId={selectedStage?.id}
            onSuccess={handleChannelUpdate}
          />
          <ApplyTemplateDialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            stages={stages}
            selectedStageId={selectedStage?.id}
            clientId={selectedClient.id}
            onSuccess={handleChannelUpdate}
          />
        </>
      )}
    </div>
  );
};

export default MarketingFlowchart;
