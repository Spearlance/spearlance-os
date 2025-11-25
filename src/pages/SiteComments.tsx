import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Search, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  conversation_number: number;
  duda_page_uuid: string;
  device: string;
  status: string;
  created_by_account: string;
  created_at: string;
  comment_count?: number;
  last_comment?: string;
}

const SiteComments = () => {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");

  useEffect(() => {
    if (selectedClient?.id) {
      loadConversations();
    }
  }, [selectedClient?.id, statusFilter]);

  const loadConversations = async () => {
    if (!selectedClient?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from("duda_conversations")
        .select(`
          id,
          conversation_number,
          duda_page_uuid,
          device,
          status,
          created_by_account,
          created_at
        `)
        .eq("client_id", selectedClient.id)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get comment counts and latest comment for each conversation
      const conversationsWithCounts = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from("duda_conversation_comments")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id);

          const { data: lastComment } = await supabase
            .from("duda_conversation_comments")
            .select("comment_text")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            comment_count: count || 0,
            last_comment: lastComment?.comment_text,
          };
        })
      );

      setConversations(conversationsWithCounts);
    } catch (error: any) {
      console.error("Error loading conversations:", error);
      toast.error("Failed to load site comments");
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      conv.duda_page_uuid?.toLowerCase().includes(search) ||
      conv.created_by_account?.toLowerCase().includes(search) ||
      conv.last_comment?.toLowerCase().includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "default";
      case "resolved":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device?.toUpperCase()) {
      case "DESKTOP":
        return "💻";
      case "TABLET":
        return "📱";
      case "MOBILE":
        return "📱";
      default:
        return "🖥️";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Site Comments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage comments from your Duda website editor
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by page, author, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading conversations...
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Comments Yet</h3>
          <p className="text-muted-foreground">
            Comments from your Duda website will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conv) => (
            <Card
              key={conv.id}
              className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/website/comments/${conv.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-semibold">
                      #{conv.conversation_number}
                    </span>
                    <Badge variant={getStatusColor(conv.status)}>
                      {conv.status === "open" ? (
                        <Clock className="h-3 w-3 mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      {conv.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {getDeviceIcon(conv.device)} {conv.device}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Page:</span> {conv.duda_page_uuid || "Unknown"}
                  </div>
                  
                  {conv.last_comment && (
                    <p className="text-sm line-clamp-2 text-muted-foreground">
                      {conv.last_comment}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>By: {conv.created_by_account}</span>
                    <span>•</span>
                    <span>{new Date(conv.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{conv.comment_count} {conv.comment_count === 1 ? "comment" : "comments"}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteComments;
