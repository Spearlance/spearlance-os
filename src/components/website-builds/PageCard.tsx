import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface PageCardProps {
  page: {
    id: string;
    page_name: string;
    page_type: string | null;
    status: string;
    content_notes: string | null;
  };
  buildId: string;
  isDragging?: boolean;
}

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  content_ready: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  designed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  built: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  reviewed: "bg-green-500/10 text-green-500 border-green-500/20",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  content_ready: "Content Ready",
  designed: "Designed",
  built: "Built",
  reviewed: "Reviewed",
};

const pageTypeLabels: Record<string, string> = {
  landing: "Landing",
  content: "Content",
  form: "Form",
  gallery: "Gallery",
  blog: "Blog",
  contact: "Contact",
};

export function PageCard({ page, buildId, isDragging }: PageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [contentNotes, setContentNotes] = useState(page.content_notes || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePage = useMutation({
    mutationFn: async (updates: Partial<typeof page>) => {
      const { error } = await supabase
        .from("website_build_pages")
        .update(updates)
        .eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
    },
    onError: (error) => {
      toast({
        title: "Error updating page",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("website_build_pages")
        .delete()
        .eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
      toast({ title: "Page deleted" });
    },
    onError: (error) => {
      toast({
        title: "Error deleting page",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNotesBlur = () => {
    if (contentNotes !== (page.content_notes || "")) {
      updatePage.mutate({ content_notes: contentNotes || null });
    }
  };

  return (
    <Card className={`transition-shadow ${isDragging ? "shadow-lg" : ""}`}>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{page.page_name}</span>
              {page.page_type && (
                <Badge variant="secondary" className="text-xs">
                  {pageTypeLabels[page.page_type] || page.page_type}
                </Badge>
              )}
            </div>
          </div>

          <Select
            value={page.status}
            onValueChange={(value) => updatePage.mutate({ status: value })}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <Badge variant="outline" className={statusColors[value]}>
                    {label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete page?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{page.page_name}" from this build.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deletePage.mutate()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {expanded && (
          <div className="mt-4 ml-8">
            <Textarea
              placeholder="Content notes for this page..."
              value={contentNotes}
              onChange={(e) => setContentNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={3}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
