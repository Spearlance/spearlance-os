import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClient } from "@/contexts/ClientContext";

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date_time: "",
    attendees: "",
    summary: "",
    tags: "",
    title: "",
    meeting_type: "video",
    join_url: "",
    status: "scheduled",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    decisions: [] as string[],
    next_steps: [] as string[],
  });
  const [newDecision, setNewDecision] = useState("");
  const [newNextStep, setNewNextStep] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) {
      toast.error("Error", { description: "Please select a client first" });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const tagsArray = formData.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from("meetings")
        .insert({
          client_id: selectedClient.id,
          date_time: formData.date_time,
          attendees: formData.attendees,
          summary: `${formData.title ? `# ${formData.title}\n\n` : ""}${formData.summary}`,
          tags: tagsArray,
          created_by: user.id,
          source_system: "manual",
          status: formData.status,
          join_url: formData.join_url || null,
          decisions: formData.decisions,
          next_steps: formData.next_steps,
          timezone: formData.timezone,
        });

      if (error) throw error;

      toast.success("Success", { description: "Meeting created successfully" });

      onOpenChange(false);
      setFormData({ 
        date_time: "", 
        attendees: "", 
        summary: "", 
        tags: "",
        title: "",
        meeting_type: "video",
        join_url: "",
        status: "scheduled",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        decisions: [],
        next_steps: [],
      });
      navigate("/meetings");
    } catch (error) {
      toast.error("Error", { description: "Failed to create meeting" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Meeting</DialogTitle>
          <DialogDescription>
            Record meeting details including date, attendees, summary, decisions, and next steps.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_time">Date & Time *</Label>
              <Input
                id="date_time"
                type="datetime-local"
                value={formData.date_time}
                onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Phoenix">Arizona (No DST)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
              <option value="Europe/London">London (GMT/BST)</option>
              <option value="Europe/Paris">Central European (CET/CEST)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div>
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Q1 Strategy Session"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meeting_type">Meeting Type</Label>
              <select
                id="meeting_type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.meeting_type}
                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
              >
                <option value="video">Video Call</option>
                <option value="call">Phone Call</option>
                <option value="in-person">In-Person</option>
                <option value="email">Email Summary</option>
              </select>
            </div>
            <div>
              <Label htmlFor="join_url">Join URL</Label>
              <Input
                id="join_url"
                value={formData.join_url}
                onChange={(e) => setFormData({ ...formData, join_url: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="attendees">Attendees</Label>
            <Input
              id="attendees"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              placeholder="John Doe, Jane Smith"
            />
          </div>

          <div>
            <Label htmlFor="summary">Summary *</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Meeting summary and notes..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div>
            <Label>Decisions</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newDecision}
                  onChange={(e) => setNewDecision(e.target.value)}
                  placeholder="Add a decision"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newDecision.trim()) {
                        setFormData({ ...formData, decisions: [...formData.decisions, newDecision.trim()] });
                        setNewDecision("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newDecision.trim()) {
                      setFormData({ ...formData, decisions: [...formData.decisions, newDecision.trim()] });
                      setNewDecision("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {formData.decisions.map((decision, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                  <span className="flex-1">{decision}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, decisions: formData.decisions.filter((_, idx) => idx !== i) })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Next Steps</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="Add a next step"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newNextStep.trim()) {
                        setFormData({ ...formData, next_steps: [...formData.next_steps, newNextStep.trim()] });
                        setNewNextStep("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newNextStep.trim()) {
                      setFormData({ ...formData, next_steps: [...formData.next_steps, newNextStep.trim()] });
                      setNewNextStep("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {formData.next_steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                  <span className="flex-1">{step}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, next_steps: formData.next_steps.filter((_, idx) => idx !== i) })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="strategy, review, planning"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedClient}>
              {loading ? "Logging..." : "Log Meeting"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
