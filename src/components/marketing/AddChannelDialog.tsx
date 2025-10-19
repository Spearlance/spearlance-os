import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Stage = Database["public"]["Tables"]["marketing_flow_stages"]["Row"];

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  selectedStageId?: string;
  onSuccess: () => void;
  selectedClient?: { id: string; name: string } | null;
}

export function AddChannelDialog({ open, onOpenChange, stages, selectedStageId, onSuccess, selectedClient }: AddChannelDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [formData, setFormData] = useState({
    stageId: selectedStageId || "",
    name: "",
    assignedTo: "",
    status: "not_used" as "active" | "in_progress" | "paused" | "not_used",
  });

  // Update stageId when selectedStageId changes
  useEffect(() => {
    if (selectedStageId && open) {
      setFormData((prev) => ({ ...prev, stageId: selectedStageId }));
    }
  }, [selectedStageId, open]);

  // Fetch current user role
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setCurrentUserRole(profile?.role || "");
      }
    };
    if (open) {
      fetchUserRole();
    }
  }, [open]);

  // Fetch and filter team members based on role
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedClient?.id || !currentUserRole) return;

      setLoadingMembers(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, email, role")
          .contains("associated_client_ids", [selectedClient.id])
          .order("name");

        if (error) throw error;

        let filteredMembers = data || [];
        if (currentUserRole === "client") {
          // Clients can only assign to other clients (not to admins/FMMs)
          filteredMembers = filteredMembers.filter((m) => m.role === "client");
        }
        // Admins and FMMs can assign to ANYONE, so no filtering needed for them

        setTeamMembers(filteredMembers);
      } catch (error) {
        console.error("Error fetching team members:", error);
        toast({
          title: "Error",
          description: "Failed to load team members",
          variant: "destructive",
        });
      } finally {
        setLoadingMembers(false);
      }
    };

    if (open && currentUserRole) {
      fetchTeamMembers();
    }
  }, [open, currentUserRole, selectedClient?.id, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.stageId || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("marketing_flow_channels")
        .insert({
          stage_id: formData.stageId,
          name: formData.name,
          assigned_to: formData.assignedTo || null,
          ownership: "client",
          status: formData.status,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Channel added successfully",
      });

      setFormData({
        stageId: "",
        name: "",
        assignedTo: "",
        status: "not_used",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding channel:", error);
      toast({
        title: "Error",
        description: "Failed to add channel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Channel</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="stage">Stage *</Label>
            <Select
              value={formData.stageId}
              onValueChange={(value) => setFormData({ ...formData, stageId: value })}
            >
              <SelectTrigger id="stage">
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Channel Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Google Ads"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assign To</Label>
            {loadingMembers ? (
              <p className="text-sm text-muted-foreground">Loading team members...</p>
            ) : (
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="Select team member (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.role.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {teamMembers.length === 0 && !loadingMembers && (
              <p className="text-sm text-muted-foreground">
                No team members available to assign
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="not_used">Not Used</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Channel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
