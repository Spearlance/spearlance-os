import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Copy, 
  MoreVertical,
  Trash2,
  Calendar,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface AIReport {
  id: string;
  client_id: string;
  report_type: string;
  report_name: string;
  date_range_start: string;
  date_range_end: string;
  report_content: string;
  executive_summary: string | null;
  created_at: string;
}

interface AIReportViewerProps {
  report: AIReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  'performance_summary': 'Performance Summary',
  'channel_deep_dive': 'Channel Deep Dive',
  'website_analytics': 'Website Analytics',
  'seo_report': 'SEO Report',
};

export const AIReportViewer = ({
  report,
  open,
  onOpenChange,
  onDelete,
}: AIReportViewerProps) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = async () => {
    if (!report) return;
    
    try {
      await navigator.clipboard.writeText(report.report_content);
      toast({ title: "Report copied to clipboard" });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy report to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!report) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('ai_generated_reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;

      toast({ title: "Report deleted" });
      onOpenChange(false);
      onDelete();
    } catch (error: any) {
      toast({
        title: "Error deleting report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!report) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Generated
                  </Badge>
                  <Badge variant="outline">
                    {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                  </Badge>
                </div>
                <SheetTitle className="text-xl">{report.report_name}</SheetTitle>
                <SheetDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(report.date_range_start), "MMM d")} - {format(new Date(report.date_range_end), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Generated {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </SheetDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Report
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetHeader>

          {report.executive_summary && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-sm text-primary mb-2">Executive Summary</h3>
              <p className="text-sm">{report.executive_summary}</p>
            </div>
          )}

          <div className="mt-6 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 pb-2 border-b">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 space-y-1">{children}</ul>,
                li: ({ children }) => <li className="ml-4">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {report.report_content}
            </ReactMarkdown>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{report.report_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
