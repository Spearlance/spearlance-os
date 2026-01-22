import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { BuildOverviewTab } from "@/components/website-builds/BuildOverviewTab";
import { BuildPagesTab } from "@/components/website-builds/BuildPagesTab";
import { BuildDevNotesTab } from "@/components/website-builds/BuildDevNotesTab";
import { BuildLinkedTasksTab } from "@/components/website-builds/BuildLinkedTasksTab";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function WebsiteBuildDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedClient, setSelectedClient, clients } = useClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle URL params for deep-linking (from Designer Workload, etc.)
  useEffect(() => {
    const clientId = searchParams.get('client');
    
    // If a client ID is specified and it's different from current, switch to it
    if (clientId && selectedClient?.id !== clientId) {
      const targetClient = clients.find(c => c.id === clientId);
      if (targetClient) {
        setSelectedClient(targetClient);
        // Clear the URL param after switching
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, selectedClient, clients, setSelectedClient, setSearchParams]);

  const { data: build, isLoading } = useQuery({
    queryKey: ["website-build", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("website_builds")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateBuild = useMutation({
    mutationFn: async (updates: Partial<typeof build>) => {
      const { error } = await supabase
        .from("website_builds")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build", id] });
    },
    onError: (error) => {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!build) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Build not found.</p>
        <Button variant="ghost" onClick={() => navigate("/website/builds")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Builds
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/website/builds")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{build.name}</h1>
          <p className="text-muted-foreground">
            {selectedClient?.name} • Target: {build.target_launch_date || "Not set"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="dev-notes">Dev Notes</TabsTrigger>
          <TabsTrigger value="tasks">Linked Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <BuildOverviewTab build={build} onUpdate={(updates) => updateBuild.mutate(updates)} />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <BuildPagesTab buildId={build.id} clientId={build.client_id} />
        </TabsContent>

        <TabsContent value="dev-notes" className="mt-6">
          <BuildDevNotesTab 
            devNotes={build.dev_notes || ""} 
            onUpdate={(notes) => updateBuild.mutate({ dev_notes: notes })}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <BuildLinkedTasksTab buildId={build.id} clientId={build.client_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
