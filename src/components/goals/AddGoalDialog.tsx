import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  quarter: number;
  year: number;
  onSuccess: () => void;
}

export function AddGoalDialog({ 
  open, 
  onOpenChange, 
  clientId, 
  quarter, 
  year, 
  onSuccess 
}: AddGoalDialogProps) {
  const [goalText, setGoalText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!goalText.trim()) {
      toast.error("Please enter a goal");
      return;
    }

    setLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("quarterly_goals")
        .insert({
          client_id: clientId,
          quarter,
          year,
          goal_text: goalText.trim(),
          notes: notes.trim() || null,
          created_by: userData.user?.id,
        });

      if (error) throw error;

      toast.success("Goal added successfully");
      onSuccess();
      onOpenChange(false);
      setGoalText("");
      setNotes("");
    } catch (error: any) {
      console.error("Error adding goal:", error);
      toast.error(error.message || "Failed to add goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Quarterly Goal</DialogTitle>
          <DialogDescription>
            Add a new goal for Q{quarter} {year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal">Goal *</Label>
            <Textarea
              id="goal"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="e.g., Increase revenue by 20%"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context or details..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!goalText.trim() || loading}>
            {loading ? "Adding..." : "Add Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
