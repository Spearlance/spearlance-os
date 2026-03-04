import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogCommunicationDialog } from "@/components/communications/LogCommunicationDialog";
import { Plus, Mail, Phone, MessageSquare, ExternalLink, RefreshCw } from "lucide-react";

interface CommunicationLog {
  id: string;
  type: 'email' | 'text' | 'call';
  subject_line: string;
  participants: Array<{ name: string; email: string; role: string }>;
  created_at: string;
  last_message_at: string;
  attachments: Array<any>;
  tags: string[];
  front_conversation_url: string | null;
  client_id: string;
}

export default function CommunicationLogs() {
  const { selectedClient } = useClient();
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (selectedClient && userRole) {
      if (userRole !== 'admin' && userRole !== 'fmm') {
        navigate('/');
        toast.error("Access Denied", { description: "This page is only accessible to FMMs and Admins" });
        return;
      }
      loadLogs();
    }
  }, [selectedClient, typeFilter, searchQuery, userRole, navigate]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    setUserRole(data?.role || null);
  };

  const loadLogs = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("communication_logs")
      .select("*")
      .eq("client_id", selectedClient.id);

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter as any);
    }

    if (searchQuery.trim()) {
      query = query.textSearch('search_vector', searchQuery.trim());
    }

    const { data, error } = await query.order("last_message_at", { ascending: false });

    if (error) {
      toast.error("Error loading communication logs");
      return;
    }

    setLogs((data || []) as any);
  };

  const handleSyncFromFront = async () => {
    if (!selectedClient) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('front-sync-conversations', {
        body: { client_id: selectedClient.id },
      });

      if (error) throw error;

      const { synced, created, updated, errors } = data;
      
      if (errors && errors.length > 0) {
        toast.error("Sync completed with errors", { description: `Synced ${synced} conversations (${created} new, ${updated} updated). ${errors.length} errors occurred.` });
      } else {
        toast.success("Sync complete", { description: `Synced ${synced} conversations (${created} new, ${updated} updated)` });
      }

      loadLogs();
    } catch (error) {
      toast.error("Sync failed", { description: "Failed to sync conversations from Front" });
    } finally {
      setIsSyncing(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      email: { icon: Mail, variant: "default" as const, label: "EMAIL" },
      call: { icon: Phone, variant: "secondary" as const, label: "CALL" },
      text: { icon: MessageSquare, variant: "outline" as const, label: "TEXT" },
    };

    const { icon: Icon, variant, label } = config[type as keyof typeof config] || config.email;

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (userRole !== 'admin' && userRole !== 'fmm') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Communication Logs</h1>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="text">Texts</SelectItem>
              <SelectItem value="call">Calls</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button 
            onClick={handleSyncFromFront} 
            disabled={isSyncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync from Front'}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Communication
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Attachments</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No communication logs found. Start by logging a communication or setting up Front webhook.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/communications/logs/${log.id}`)}
                >
                  <TableCell>{getTypeBadge(log.type)}</TableCell>
                  <TableCell className="font-medium">{log.subject_line}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {log.participants.slice(0, 3).map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {p.name}
                        </Badge>
                      ))}
                      {log.participants.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{log.participants.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(log.last_message_at || log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {log.attachments?.length > 0 && (
                      <Badge variant="outline">{log.attachments.length}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-xs">
                      {log.tags?.slice(0, 2).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {log.tags?.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{log.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.front_conversation_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(log.front_conversation_url!, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LogCommunicationDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) loadLogs();
        }}
      />
    </div>
  );
}
