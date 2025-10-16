import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ExternalLink, MoreVertical, Star } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface Report {
  id: string;
  client_id: string;
  name: string;
  oviond_url: string;
  date_range_start: string | null;
  date_range_end: string | null;
  tags: string[];
  summary: string | null;
  owner_user_id: string | null;
  status: 'Active' | 'Archived';
  pinned: boolean;
  created_at: string;
  updated_at: string;
  owner?: {
    name: string;
  };
}

interface ReportDrawerProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isAdminOrFMM: boolean;
}

export const ReportDrawer = ({
  report,
  open,
  onOpenChange,
  onUpdate,
  isAdminOrFMM,
}: ReportDrawerProps) => {
  const { toast } = useToast();
  const [editedSummary, setEditedSummary] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editedOwner, setEditedOwner] = useState<string | null>(null);
  const [editedStatus, setEditedStatus] = useState<'Active' | 'Archived'>('Active');
  const [editedPinned, setEditedPinned] = useState(false);
  const [editedDateStart, setEditedDateStart] = useState<string>("");
  const [editedDateEnd, setEditedDateEnd] = useState<string>("");
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (report) {
      setEditedSummary(report.summary || "");
      setEditedTags(report.tags || []);
      setEditedOwner(report.owner_user_id);
      setEditedStatus(report.status);
      setEditedPinned(report.pinned);
      setEditedDateStart(report.date_range_start || "");
      setEditedDateEnd(report.date_range_end || "");
    }
  }, [report]);

  useEffect(() => {
    if (open) {
      loadOwners();
    }
  }, [open]);

  const loadOwners = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .in("role", ["admin", "fmm"])
      .order("name");
    if (data) setOwners(data);
  };

  const handleSave = async () => {
    if (!report) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          summary: editedSummary,
          tags: editedTags,
          owner_user_id: editedOwner,
          status: editedStatus,
          pinned: editedPinned,
          date_range_start: editedDateStart || null,
          date_range_end: editedDateEnd || null,
        })
        .eq("id", report.id);

      if (error) throw error;

      toast({ title: "Report updated successfully" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error updating report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", report.id);

      if (error) throw error;

      toast({ title: "Report deleted" });
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error deleting report",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async () => {
    if (!report) return;

    try {
      const { error } = await supabase.from("reports").insert({
        client_id: report.client_id,
        name: `${report.name} (Copy)`,
        oviond_url: report.oviond_url,
        date_range_start: report.date_range_start,
        date_range_end: report.date_range_end,
        tags: report.tags,
        summary: report.summary,
        owner_user_id: report.owner_user_id,
        status: report.status,
        pinned: false,
      });

      if (error) throw error;

      toast({ title: "Report duplicated" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error duplicating report",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleArchive = async () => {
    if (!report) return;

    const newStatus = report.status === 'Active' ? 'Archived' : 'Active';
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", report.id);

      if (error) throw error;

      toast({ title: `Report ${newStatus === 'Archived' ? 'archived' : 'unarchived'}` });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error updating report",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !editedTags.includes(tagInput.trim())) {
      setEditedTags([...editedTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setEditedTags(editedTags.filter((t) => t !== tag));
  };

  if (!report) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <SheetTitle>{report.name}</SheetTitle>
                <SheetDescription>
                  Created {format(new Date(report.created_at), "MMM d, yyyy")}
                </SheetDescription>
              </div>
              {isAdminOrFMM && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDuplicate}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleArchive}>
                      {report.status === 'Active' ? 'Archive' : 'Unarchive'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Report Link */}
              <div>
                <Button
                  className="w-full"
                  onClick={() => window.open(report.oviond_url, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Report
                </Button>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                {isAdminOrFMM ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={editedDateStart}
                      onChange={(e) => setEditedDateStart(e.target.value)}
                    />
                    <Input
                      type="date"
                      value={editedDateEnd}
                      onChange={(e) => setEditedDateEnd(e.target.value)}
                    />
                  </div>
                ) : (
                  <p className="text-sm">
                    {report.date_range_start && report.date_range_end
                      ? `${format(new Date(report.date_range_start), "MMM d, yyyy")} to ${format(new Date(report.date_range_end), "MMM d, yyyy")}`
                      : "No date range set"}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                {isAdminOrFMM ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addTag()}
                      />
                      <Button onClick={addTag} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {editedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {report.tags.length > 0 ? (
                      report.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No tags</span>
                    )}
                  </div>
                )}
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <Label>Owner</Label>
                {isAdminOrFMM ? (
                  <Select
                    value={editedOwner || ""}
                    onValueChange={setEditedOwner}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{report.owner?.name || "Unassigned"}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                {isAdminOrFMM ? (
                  <Select
                    value={editedStatus}
                    onValueChange={(value: 'Active' | 'Archived') => setEditedStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={report.status === "Active" ? "default" : "secondary"}>
                    {report.status}
                  </Badge>
                )}
              </div>

              {/* Pin */}
              <div className="space-y-2">
                <Label>Pin</Label>
                {isAdminOrFMM ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditedPinned(!editedPinned)}
                  >
                    <Star
                      className={`h-4 w-4 mr-2 ${
                        editedPinned ? "fill-yellow-400 text-yellow-400" : ""
                      }`}
                    />
                    {editedPinned ? "Pinned" : "Not Pinned"}
                  </Button>
                ) : (
                  <p className="text-sm">{report.pinned ? "Pinned" : "Not Pinned"}</p>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label>Summary</Label>
                {isAdminOrFMM ? (
                  <>
                    <Textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      rows={8}
                      placeholder="Enter report summary..."
                    />
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {report.summary || "No summary available"}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{report.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
