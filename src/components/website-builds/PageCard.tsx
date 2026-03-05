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
import { GripVertical, Trash2, PanelRightOpen, FileText, Sparkles, ListTodo } from "lucide-react";
import { toast } from "sonner";
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
    dev_notes?: string | null;
    ai_content?: string | null;
  };
  buildId: string;
  isDragging?: boolean;
  onClick?: () => void;
}

const statusColors: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  content_ready: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  designed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  built: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  reviewed: "bg-green-500/10 text-green-500 border-green-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_review: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  content_ready: "Content Ready",
  designed: "Designed",
  built: "Built",
  reviewed: "Reviewed",
  in_progress: "In Progress",
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
  landing: "Landing",
  content: "Content",
  form: "Form",
  other: "Other",
};

export function PageCard({ page, buildId, isDragging, onClick }: PageCardProps) {
  const queryClient = useQueryClient();

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
      toast.error("Error updating page", { description: error.message });
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
      toast.success("Page deleted");
    },
    onError: (error) => {
      toast.error("Error deleting page", { description: error.message });
    },
  });

  // Check if page has content in various sections
  const hasNotes = !!page.dev_notes;
  const hasAIContent = !!page.ai_content;
  const hasContentNotes = !!page.content_notes;

  return (
    <Card 
      className={`transition-shadow hover:shadow-md cursor-pointer ${isDragging ? "shadow-lg" : ""}`}
      onClick={onClick}
    >
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div 
            className="cursor-grab"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{page.page_name}</span>
              {page.page_type && (
                <Badge variant="secondary" className="text-xs">
                  {pageTypeLabels[page.page_type] || page.page_type}
                </Badge>
              )}
            </div>
            
            {/* Indicators for content */}
            <div className="flex items-center gap-2 mt-1">
              {hasContentNotes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Notes
                </span>
              )}
              {hasNotes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ListTodo className="h-3 w-3" />
                  Dev Notes
                </span>
              )}
              {hasAIContent && (
                <span className="text-xs text-purple-600 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Content
                </span>
              )}
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
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
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            title="Open page details"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
      </CardContent>
    </Card>
  );
}
