import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Send } from "lucide-react";
import { DeleteTicketDialog } from "@/components/support/DeleteTicketDialog";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (id) {
      loadTicket();
      loadUsers();
      const cleanup = subscribeToMessages();
      fetchUserRole();
      return cleanup;
    }
  }, [id]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(profile?.role || "");
    }
  };

  const loadTicket = async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select(`
        *,
        requester:requester_user_id (id, name, email),
        owner:owner_user_id (id, name, email)
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast({ title: "Error loading ticket", variant: "destructive" });
      return;
    }

    setTicket(data);
    loadMessages();
    setLoading(false);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("ticket_messages")
      .select(`
        *,
        author:author_user_id (id, name, email, avatar_url, role)
      `)
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role")
      .neq("role", "client");

    setUsers(data || []);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${id}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Prevent clients from creating internal notes
    const canCreateInternalNote = userRole === 'admin' || userRole === 'fmm';
    const finalIsInternalNote = canCreateInternalNote && isInternalNote;

    const { error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: id,
        author_user_id: user.id,
        body_richtext: newMessage,
        is_internal_note: finalIsInternalNote,
      });

    if (error) {
      toast({ title: "Error sending message", variant: "destructive" });
      return;
    }

    setNewMessage("");
    setIsInternalNote(false);
    loadMessages();
  };

  const handleUpdateStatus = async (status: any) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating status", variant: "destructive" });
      return;
    }

    setTicket({ ...ticket, status });
    toast({ title: "Status updated" });
  };

  const handleUpdatePriority = async (priority: any) => {
    const { error } = await supabase
      .from("tickets")
      .update({ priority })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating priority", variant: "destructive" });
      return;
    }

    setTicket({ ...ticket, priority });
    toast({ title: "Priority updated" });
  };

  const handleUpdateOwner = async (ownerId: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ owner_user_id: ownerId || null })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating owner", variant: "destructive" });
      return;
    }

    const owner = users.find(u => u.id === ownerId);
    setTicket({ ...ticket, owner_user_id: ownerId, owner });
    toast({ title: "Owner updated" });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!ticket) {
    return <div className="p-6">Ticket not found</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/support")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tickets
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge>{ticket.category}</Badge>
                    <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant={ticket.status === "closed" ? "outline" : "default"}>
                      {ticket.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-4">
                Created by {ticket.requester?.name} on{" "}
                {new Date(ticket.created_at).toLocaleString()}
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {messages
                    .filter(message => {
                      // Show all messages to admin/FMM
                      if (userRole === 'admin' || userRole === 'fmm') {
                        return true;
                      }
                      // Only show non-internal notes to clients
                      return !message.is_internal_note;
                    })
                    .map((message) => {
                      const isAdminOrFMM = message.author?.role === 'admin' || message.author?.role === 'fmm';
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isAdminOrFMM ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] p-4 rounded-lg ${
                              message.is_internal_note
                                ? "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800"
                                : isAdminOrFMM
                                ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex gap-3">
                              {!isAdminOrFMM && (
                                <Avatar className="h-8 w-8">
                                  {message.author?.avatar_url && (
                                    <AvatarImage src={message.author.avatar_url} alt={message.author?.name || "User"} />
                                  )}
                                  <AvatarFallback>
                                    {message.author?.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {message.author?.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(message.created_at).toLocaleString()}
                                  </span>
                                  {message.is_internal_note && (
                                    <Badge variant="outline" className="text-xs">
                                      Internal Note
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">
                                  {message.body_richtext}
                                </p>
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Attachments: {message.attachments.join(", ")}
                                  </div>
                                )}
                              </div>
                              
                              {isAdminOrFMM && (
                                <Avatar className="h-8 w-8">
                                  {message.author?.avatar_url && (
                                    <AvatarImage src={message.author.avatar_url} alt={message.author?.name || "User"} />
                                  )}
                                  <AvatarFallback>
                                    {message.author?.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>

              <div className="space-y-3 mt-4 pt-4 border-t">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  {(userRole === 'admin' || userRole === 'fmm') && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="internal"
                        checked={isInternalNote}
                        onCheckedChange={(checked) => setIsInternalNote(checked as boolean)}
                      />
                      <label
                        htmlFor="internal"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Internal note
                      </label>
                    </div>
                  )}
                  <Button onClick={handleSendMessage} className={(userRole !== 'admin' && userRole !== 'fmm') ? 'ml-auto' : ''}>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(userRole === 'admin' || userRole === 'fmm') && (
                <>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={ticket.status} onValueChange={handleUpdateStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={ticket.priority} onValueChange={handleUpdatePriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select
                      value={ticket.owner_user_id || "unassigned"}
                      onValueChange={handleUpdateOwner}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Show read-only status info for clients */}
              {userRole === 'client' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={ticket.status === "resolved" ? "outline" : "default"}>
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    <div className="mt-1">
                      <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                  {ticket.owner && (
                    <div>
                      <Label className="text-muted-foreground">Assigned To</Label>
                      <div className="mt-1 text-sm">{ticket.owner.name}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Requester:</span>
                  <br />
                  {ticket.requester?.name}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <br />
                  {new Date(ticket.created_at).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Updated:</span>
                  <br />
                  {new Date(ticket.updated_at).toLocaleString()}
                </div>
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(userRole === "admin" || userRole === "fmm") && (
                <div className="pt-4 border-t">
                  <DeleteTicketDialog
                    ticketTitle={ticket.title}
                    ticketId={ticket.id}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
