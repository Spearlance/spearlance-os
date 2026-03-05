import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSaveStatus } from "@/hooks/useSaveStatus";

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: () => void;
}

export function AddGoalDialog({ 
  open, 
  onOpenChange, 
  clientId, 
  onSuccess 
}: AddGoalDialogProps) {
  const currentDate = new Date();
  const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
  const currentYear = currentDate.getFullYear();

  const [goalText, setGoalText] = useState("");
  const [notes, setNotes] = useState("");
  const [quarter, setQuarter] = useState<number>(currentQuarter);
  const [year, setYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(false);
  const { setSaveStatus } = useSaveStatus();

  // Generate year options (current year + 2 future years)
  const yearOptions = useMemo(() => {
    return [currentYear, currentYear + 1, currentYear + 2];
  }, [currentYear]);

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

      setSaveStatus('saved');
      onSuccess();
      onOpenChange(false);
      setGoalText("");
      setNotes("");
      setQuarter(currentQuarter);
      setYear(currentYear);
    } catch (error: any) {
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
            Set a goal for a specific quarter
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter *</Label>
              <Select value={quarter.toString()} onValueChange={(val) => setQuarter(parseInt(val))}>
                <SelectTrigger id="quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(yr => (
                    <SelectItem key={yr} value={yr.toString()}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              placeholder="Add context or strategy..."
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
