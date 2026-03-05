import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Mail, Phone, MessageSquare, Clock, User, Save, Paperclip } from "lucide-react";

interface CommunicationLog {
  id: string;
  type: 'email' | 'text' | 'call';
  subject_line: string;
  participants: Array<{ name: string; email: string; role: string }>;
  message_thread: Array<{ body: string; sender: string; timestamp: string; is_internal: boolean }>;
  attachments: Array<{ filename: string; url: string; size: number }>;
  internal_notes: string | null;
  tags: string[];
  front_conversation_url: string | null;
  call_duration_minutes: number | null;
  call_recording_url: string | null;
  created_at: string;
  last_message_at: string;
  source: string;
  client_id: string;
}

export default function CommunicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<CommunicationLog | null>(null);
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadLog();
    }
  }, [id]);

  const loadLog = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("communication_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      toast.error("Error loading communication");
      navigate("/communications/logs");
      return;
    }

    setLog(data as any);
    setInternalNotes(data.internal_notes as string || "");
    setTags((data.tags as string[])?.join(", ") || "");
  };

  const handleSave = async () => {
    if (!log) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("communication_logs")
      .update({
        internal_notes: internalNotes,
        tags: tags.split(",").map(t => t.trim()).filter(t => t),
      })
      .eq("id", log.id);

    setIsSaving(false);

    if (error) {
      toast.error("Error saving changes");
      return;
    }

    toast.success("Changes saved successfully");
    loadLog();
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      email: Mail,
      call: Phone,
      text: MessageSquare,
    };
    const Icon = icons[type as keyof typeof icons] || Mail;
    return <Icon className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!log) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/communications/logs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Logs
        </Button>
        {log.front_conversation_url && (
          <Button variant="outline" onClick={() => window.open(log.front_conversation_url!, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Front
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {getTypeIcon(log.type)}
              <h1 className="text-3xl font-bold">{log.subject_line}</h1>
            </div>
            <div className="flex gap-2">
              <Badge variant={log.type === 'email' ? 'default' : log.type === 'call' ? 'secondary' : 'outline'}>
                {log.type.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {log.source === 'front_webhook' ? 'From Front' : 'Manual Entry'}
              </Badge>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {log.participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {p.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {log.type === 'call' && (log.call_duration_minutes || log.call_recording_url) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {log.call_duration_minutes && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Duration: {log.call_duration_minutes} minutes</span>
                </div>
              )}
              {log.call_recording_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(log.call_recording_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Recording
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message Thread</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {log.message_thread.map((msg, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{msg.sender}</span>
                    {msg.is_internal && (
                      <Badge variant="outline" className="text-xs">Internal</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-sm whitespace-pre-wrap">
                  {msg.body}
                </div>
                {i < log.message_thread.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {log.attachments && log.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments ({log.attachments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {log.attachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">{att.filename}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(att.size)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(att.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Internal Notes & Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes visible only to your team..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Add tags (comma-separated)"
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          <p>Created: {new Date(log.created_at).toLocaleString()}</p>
          <p>Last message: {new Date(log.last_message_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
