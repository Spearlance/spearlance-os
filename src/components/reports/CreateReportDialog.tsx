import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: (report: any) => void;
}

export const CreateReportDialog = ({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: CreateReportDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    oviond_url: "",
    date_range_start: "",
    date_range_end: "",
    summary: "",
    owner_user_id: "",
    status: "Active" as 'Active' | 'Archived',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadOwners();
      loadCurrentUser();
    }
  }, [open]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      setFormData((prev) => ({ ...prev, owner_user_id: user.id }));
    }
  };

  const loadOwners = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .in("role", ["admin", "fmm"])
      .order("name");
    if (data) setOwners(data);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Report name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.oviond_url.trim()) {
      toast({
        title: "Validation Error",
        description: "Oviond URL is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.oviond_url.startsWith("https://")) {
      toast({
        title: "Validation Error",
        description: "Oviond URL must start with https://",
        variant: "destructive",
      });
      return;
    }

    if (formData.date_range_start && formData.date_range_end) {
      if (new Date(formData.date_range_end) < new Date(formData.date_range_start)) {
        toast({
          title: "Validation Error",
          description: "End date must be after start date",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .insert({
          client_id: clientId,
          name: formData.name,
          oviond_url: formData.oviond_url,
          date_range_start: formData.date_range_start || null,
          date_range_end: formData.date_range_end || null,
          tags: tags,
          summary: formData.summary || null,
          owner_user_id: formData.owner_user_id || null,
          status: formData.status,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Report created successfully" });
      onSuccess(data);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      oviond_url: "",
      date_range_start: "",
      date_range_end: "",
      summary: "",
      owner_user_id: currentUserId,
      status: "Active",
    });
    setTags([]);
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
          <DialogDescription>
            Add a new report with Oviond dashboard link
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Report Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Report Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Q4 2024 Performance Report"
              maxLength={200}
            />
          </div>

          {/* Oviond URL */}
          <div className="space-y-2">
            <Label htmlFor="oviond_url">
              Oviond URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="oviond_url"
              type="url"
              value={formData.oviond_url}
              onChange={(e) =>
                setFormData({ ...formData, oviond_url: e.target.value })
              }
              placeholder="https://oviond.com/..."
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={formData.date_range_start}
                onChange={(e) =>
                  setFormData({ ...formData, date_range_start: e.target.value })
                }
              />
              <Input
                type="date"
                value={formData.date_range_end}
                onChange={(e) =>
                  setFormData({ ...formData, date_range_end: e.target.value })
                }
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
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

          {/* Owner */}
          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Select
              value={formData.owner_user_id}
              onValueChange={(value) =>
                setFormData({ ...formData, owner_user_id: value })
              }
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
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'Active' | 'Archived') =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              placeholder="Brief summary of the report..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
