import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageCard } from "./PageCard";
import { AddPageDialog } from "./AddPageDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import PageDrawer from "./PageDrawer";

interface BuildPagesTabProps {
  buildId: string;
  clientId: string;
}

interface Page {
  id: string;
  page_name: string;
  page_type: string;
  status: string;
  content_notes: string | null;
  dev_notes: string | null;
  ai_content: string | null;
  sort_order: number;
  build_id: string;
}

export function BuildPagesTab({ buildId, clientId }: BuildPagesTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["website-build-pages", buildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_build_pages")
        .select("*")
        .eq("build_id", buildId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Page[];
    },
  });

  const reorderPages = useMutation({
    mutationFn: async (reorderedPages: { id: string; sort_order: number }[]) => {
      for (const page of reorderedPages) {
        const { error } = await supabase
          .from("website_build_pages")
          .update({ sort_order: page.sort_order })
          .eq("id", page.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !pages) return;

    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    reorderPages.mutate(updates);
  };

  const handlePageClick = (page: Page) => {
    setSelectedPage({
      ...page,
      name: page.page_name,
    } as Page & { name: string });
    setDrawerOpen(true);
  };

  // Update selected page when pages data changes
  const currentSelectedPage = selectedPage && pages
    ? pages.find((p) => p.id === selectedPage.id)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Pages ({pages?.length || 0})
        </h3>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>

      {pages?.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No pages added yet</p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Page
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="pages">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {pages?.map((page, index) => (
                  <Draggable key={page.id} draggableId={page.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <PageCard 
                          page={page} 
                          buildId={buildId}
                          isDragging={snapshot.isDragging}
                          onClick={() => handlePageClick(page)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <AddPageDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        buildId={buildId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
          setAddDialogOpen(false);
        }}
      />

      <PageDrawer
        page={currentSelectedPage ? {
          id: currentSelectedPage.id,
          name: currentSelectedPage.page_name,
          page_type: currentSelectedPage.page_type || "other",
          status: currentSelectedPage.status,
          content_notes: currentSelectedPage.content_notes,
          dev_notes: currentSelectedPage.dev_notes,
          ai_content: currentSelectedPage.ai_content,
          sort_order: currentSelectedPage.sort_order,
          build_id: currentSelectedPage.build_id,
        } : null}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        buildId={buildId}
        clientId={clientId}
      />
    </div>
  );
}
