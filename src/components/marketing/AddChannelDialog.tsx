import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Stage = Database["public"]["Tables"]["marketing_flow_stages"]["Row"];

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  onSuccess: () => void;
}

export function AddChannelDialog({ open, onOpenChange, stages, onSuccess }: AddChannelDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    stageId: "",
    name: "",
    ownership: "spearlance" as "spearlance" | "client" | "both",
    status: "not_used" as "active" | "in_progress" | "paused" | "not_used",
  });

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
          ownership: formData.ownership,
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
        ownership: "spearlance",
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
            <Label>Ownership</Label>
            <RadioGroup
              value={formData.ownership}
              onValueChange={(value: any) => setFormData({ ...formData, ownership: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spearlance" id="spearlance" />
                <Label htmlFor="spearlance" className="font-normal cursor-pointer">
                  Spearlance Handles
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="client" id="client" />
                <Label htmlFor="client" className="font-normal cursor-pointer">
                  Client Handles
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="font-normal cursor-pointer">
                  Both
                </Label>
              </div>
            </RadioGroup>
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
