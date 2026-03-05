import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, CheckCircle2, Clock, Trash2, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  duda_comment_uuid: string;
  comment_text: string;
  author_account: string | null;
  is_internal_reply: boolean;
  author_user_id: string | null;
  created_at: string;
  author_name?: string;
  visibility: string;
  editor_link: string | null;
}

interface Conversation {
  id: string;
  conversation_number: number;
  duda_page_uuid: string;
  status: string;
  created_by_account: string;
  created_at: string;
  title?: string;
}

const SiteCommentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalReply, setInternalReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && selectedClient?.id) {
      loadConversation();
      loadComments();
      subscribeToComments();
    }
  }, [id, selectedClient?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversation = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("duda_conversations")
        .select("id, conversation_number, duda_page_uuid, status, created_by_account, created_at, title")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setConversation(data);
    } catch (error: any) {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("duda_conversation_comments")
        .select(`
          *,
          author:profiles!duda_conversation_comments_author_user_id_fkey(name)
        `)
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const commentsWithAuthor = (data || []).map((comment: any) => ({
        ...comment,
        author_name: comment.author?.name,
      }));

      setComments(commentsWithAuthor);
    } catch (error: any) {
      toast.error("Failed to load comments");
    }
  };

  const subscribeToComments = () => {
    if (!id) return;

    const channel = supabase
      .channel("comment-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "duda_conversation_comments",
          filter: `conversation_id=eq.${id}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitReply = async () => {
    if (!internalReply.trim() || !id) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("duda_conversation_comments")
        .insert({
          conversation_id: id,
          duda_comment_uuid: `internal-${Date.now()}-${Math.random()}`,
          comment_text: internalReply.trim(),
          is_internal_reply: true,
          author_user_id: user.id,
        });

      if (error) throw error;

      setInternalReply("");
      toast.success("Internal reply added");
      loadComments();
    } catch (error: any) {
      toast.error("Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!conversation) return;

    const newStatus = conversation.status === "open" ? "resolved" : "open";

    try {
      const { error } = await supabase
        .from("duda_conversations")
        .update({ 
          status: newStatus,
          resolved_at: newStatus === "resolved" ? new Date().toISOString() : null
        })
        .eq("id", conversation.id);

      if (error) throw error;

      setConversation({ ...conversation, status: newStatus });
      toast.success(`Conversation ${newStatus}`);
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Conversation not found</div>
      </div>
    );
  }

  const editorLink = comments[0]?.editor_link;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/website/comments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Comments
        </Button>
        <div className="flex items-center gap-2">
          {editorLink && (
            <Button
              variant="outline"
              onClick={() => window.open(editorLink, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Editor
            </Button>
          )}
          <Button
            variant={conversation.status === "open" ? "default" : "outline"}
            onClick={handleToggleStatus}
          >
            {conversation.status === "open" ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Resolved
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Reopen
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">
              {conversation.title || `Comment #${conversation.conversation_number}`}
            </h1>
            <Badge variant={conversation.status === "open" ? "default" : "secondary"}>
              {conversation.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {conversation.duda_page_uuid && (
              <div>
                <span className="text-muted-foreground">Page:</span>
                <span className="ml-2 font-medium">{conversation.duda_page_uuid}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created by:</span>
              <span className="ml-2 font-medium">{conversation.created_by_account}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-2 font-medium">
                {new Date(conversation.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Conversation Thread</h2>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg ${
                comment.is_internal_reply || comment.visibility === 'internal'
                  ? "bg-primary/10 border-l-4 border-primary"
                  : "bg-muted"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {(comment.is_internal_reply || comment.visibility === 'internal') && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Internal
                    </Badge>
                  )}
                  <span className="font-medium">
                    {comment.is_internal_reply
                      ? comment.author_name || "Team Member"
                      : comment.author_account || "Duda User"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <label className="text-sm font-medium">Add Internal Reply</label>
          <Textarea
            placeholder="Write an internal reply (only visible to your team)..."
            value={internalReply}
            onChange={(e) => setInternalReply(e.target.value)}
            rows={4}
          />
          <Button
            onClick={handleSubmitReply}
            disabled={submitting || !internalReply.trim()}
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Sending..." : "Send Internal Reply"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SiteCommentDetail;
