import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListTodo, FileText, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTasksTab from "./PageTasksTab";
import PageNotesTab from "./PageNotesTab";
import PageAIContentTab from "./PageAIContentTab";

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

interface PageDrawerProps {
  page: Page | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildId: string;
  clientId: string;
}

const statusColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  content_ready: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  content_ready: "Content Ready",
  in_review: "In Review",
  approved: "Approved",
};

const pageTypeLabels: Record<string, string> = {
  home: "Home",
  about: "About",
  services: "Services",
  service_detail: "Service Detail",
  contact: "Contact",
  gallery: "Gallery",
  blog: "Blog",
  landing: "Landing Page",
  other: "Other",
};

export default function PageDrawer({ page, open, onOpenChange, buildId, clientId }: PageDrawerProps) {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!page) return;
      const { error } = await supabase
        .from("website_build_pages")
        .update({ status: newStatus })
        .eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  if (!page) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <SheetTitle className="text-xl">{page.page_name}</SheetTitle>
              <Badge variant="outline" className="text-xs">
                {pageTypeLabels[page.page_type] || page.page_type}
              </Badge>
            </div>
            <Select value={page.status} onValueChange={(value) => updateStatus.mutate(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColors[value]?.split(" ")[0]}`} />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <Tabs defaultValue="tasks" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="ai-content" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            <PageTasksTab pageId={page.id} buildId={buildId} clientId={clientId} />
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <PageNotesTab pageId={page.id} buildId={buildId} initialNotes={page.dev_notes || ""} />
          </TabsContent>

          <TabsContent value="ai-content" className="mt-4">
            <PageAIContentTab 
              pageId={page.id} 
              buildId={buildId} 
              clientId={clientId}
              pageType={page.page_type}
              pageName={page.page_name}
              initialContent={page.ai_content || ""}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
