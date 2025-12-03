import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail, Phone, Video, Plus, Trash2, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { OpenThread } from "@/hooks/useSuccessHub";

interface CommunicationHubCardProps {
  communications: any[];
  openThreads: OpenThread[];
  onUpdateThreads: (threads: OpenThread[]) => void;
}

const typeIcons = {
  email: Mail,
  call: Phone,
  meeting: Video,
  note: MessageSquare,
};

export function CommunicationHubCard({
  communications,
  openThreads,
  onUpdateThreads,
}: CommunicationHubCardProps) {
  const [newThread, setNewThread] = useState("");

  const addThread = () => {
    if (!newThread.trim()) return;
    onUpdateThreads([
      ...openThreads,
      {
        id: crypto.randomUUID(),
        question: newThread.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewThread("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Communication Hub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recent Communications */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Interactions</h4>
          {communications.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No recent communications</p>
          ) : (
            <div className="space-y-2">
              {communications.map((comm) => {
                const Icon = typeIcons[comm.type as keyof typeof typeIcons] || MessageSquare;
                return (
                  <div key={comm.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{comm.subject_line}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {comm.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(comm.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Open Threads */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1">
            <HelpCircle className="h-4 w-4" /> Open Threads
          </h4>
          <p className="text-xs text-muted-foreground mb-2">Questions we owe the client answers to</p>
          <div className="space-y-2">
            {openThreads.map((thread) => (
              <div key={thread.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <HelpCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{thread.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added {format(new Date(thread.createdAt), 'MMM d')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => onUpdateThreads(openThreads.filter(t => t.id !== thread.id))}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Input
                value={newThread}
                onChange={(e) => setNewThread(e.target.value)}
                placeholder="Add an open question..."
                onKeyDown={(e) => e.key === 'Enter' && addThread()}
              />
              <Button variant="outline" size="icon" onClick={addThread}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
