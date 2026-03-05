import { useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Upload } from "lucide-react";

interface LogCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Participant {
  name: string;
  email: string;
  role: 'from' | 'to' | 'cc';
}

export function LogCommunicationDialog({ open, onOpenChange }: LogCommunicationDialogProps) {
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<'email' | 'text' | 'call'>('email');
  const [subject, setSubject] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    { name: "", email: "", role: "from" }
  ]);
  const [messageBody, setMessageBody] = useState("");
  const [callDuration, setCallDuration] = useState("");
  const [callRecordingUrl, setCallRecordingUrl] = useState("");
  const [tags, setTags] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const resetForm = () => {
    setType('email');
    setSubject("");
    setParticipants([{ name: "", email: "", role: "from" }]);
    setMessageBody("");
    setCallDuration("");
    setCallRecordingUrl("");
    setTags("");
    setInternalNotes("");
    setFiles(null);
  };

  const addParticipant = () => {
    setParticipants([...participants, { name: "", email: "", role: "to" }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const uploadAttachments = async (): Promise<Array<{ filename: string; url: string; size: number }>> => {
    if (!files || files.length === 0) return [];

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${selectedClient?.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('communication-attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading file:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('communication-attachments')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        filename: file.name,
        url: publicUrl,
        size: file.size,
      });
    }

    return uploadedFiles;
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error("Please select a client first");
      return;
    }

    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    const validParticipants = participants.filter(p => p.email.trim());
    if (validParticipants.length === 0) {
      toast.error("At least one participant is required");
      return;
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const p of validParticipants) {
      if (!emailRegex.test(p.email)) {
        toast.error(`Invalid email: ${p.email}`);
        return;
      }
    }

    if (!messageBody.trim()) {
      toast.error("Message content is required");
      return;
    }

    if (type === 'call' && callDuration && parseInt(callDuration) <= 0) {
      toast.error("Call duration must be greater than 0");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload attachments
      const uploadedAttachments = await uploadAttachments();

      // Format message thread
      const messageThread = [{
        body: messageBody,
        sender: validParticipants[0]?.email || 'unknown',
        timestamp: new Date().toISOString(),
        is_internal: false,
      }];

      // Prepare data
      const logData = {
        client_id: selectedClient.id,
        type,
        subject_line: subject,
        participants: validParticipants as any,
        message_thread: messageThread as any,
        attachments: uploadedAttachments as any,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        internal_notes: internalNotes || null,
        source: 'manual',
        last_message_at: new Date().toISOString(),
        created_by: user.id,
        call_duration_minutes: type === 'call' && callDuration ? parseInt(callDuration) : null,
        call_recording_url: type === 'call' && callRecordingUrl ? callRecordingUrl : null,
      };

      const { error } = await supabase
        .from('communication_logs')
        .insert([logData]);

      if (error) throw error;

      toast.success("Communication logged successfully");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Error logging communication", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="text">Text Message</SelectItem>
                <SelectItem value="call">Phone Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject / Description</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={type === 'call' ? "Brief call description" : "Subject line"}
            />
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Name"
                    value={p.name}
                    onChange={(e) => updateParticipant(i, 'name', e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={p.email}
                    onChange={(e) => updateParticipant(i, 'email', e.target.value)}
                  />
                </div>
                <Select
                  value={p.role}
                  onValueChange={(v) => updateParticipant(i, 'role', v)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from">From</SelectItem>
                    <SelectItem value="to">To</SelectItem>
                    <SelectItem value="cc">CC</SelectItem>
                  </SelectContent>
                </Select>
                {participants.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParticipant(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addParticipant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Participant
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Message Content</Label>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Enter the message content..."
              rows={6}
            />
          </div>

          {type === 'call' && (
            <>
              <div className="space-y-2">
                <Label>Call Duration (minutes)</Label>
                <Input
                  type="number"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  placeholder="Duration in minutes"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Recording URL (optional)</Label>
                <Input
                  value={callRecordingUrl}
                  onChange={(e) => setCallRecordingUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Attachments (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {files && files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags (optional)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="urgent, follow-up, pricing (comma-separated)"
            />
          </div>

          <div className="space-y-2">
            <Label>Internal Notes (optional)</Label>
            <Textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal notes visible only to your team..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !selectedClient}>
              {loading ? "Logging..." : "Log Communication"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
