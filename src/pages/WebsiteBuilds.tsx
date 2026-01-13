import { useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { BuildCard } from "@/components/website-builds/BuildCard";
import { CreateBuildDialog } from "@/components/website-builds/CreateBuildDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function WebsiteBuilds() {
  const { selectedClient } = useClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: builds, isLoading, refetch } = useQuery({
    queryKey: ["website-builds", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const { data, error } = await supabase
        .from("website_builds")
        .select(`
          *,
          pages:website_build_pages(count),
          linked_tasks:website_build_tasks(count)
        `)
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClient?.id,
  });

  if (!selectedClient) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select a client to view website builds.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website Builds</h1>
          <p className="text-muted-foreground">
            Manage website projects for {selectedClient.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as "grid" | "list")}
          >
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Build
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : builds?.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-medium mb-2">No website builds yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first website build project to get started.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Build
          </Button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {builds?.map((build) => (
            <BuildCard 
              key={build.id} 
              build={build} 
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      <CreateBuildDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={selectedClient.id}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
}
