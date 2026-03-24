import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Edit, FileText } from "lucide-react";
import { BlogArticleEditor } from "./BlogArticleEditor";

interface QualityScores {
  word_count?: number;
  h2_count?: number;
  internal_links?: number;
  primary_keyword_density?: number;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  quality_scores: QualityScores | null;
  topic_id: string | null;
  created_at: string;
}

function QualityBadge({
  label,
  value,
  green,
  yellow,
}: {
  label: string;
  value: string | number | undefined;
  green: boolean;
  yellow?: boolean;
}) {
  const color = green
    ? "bg-green-100 text-green-800 border-green-200"
    : yellow
    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
    : "bg-red-100 text-red-800 border-red-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}
    >
      {label}: {value ?? "—"}
    </span>
  );
}

export function BlogApprovalQueue() {
  const { selectedClient } = useClient();
  const queryClient = useQueryClient();
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-approval-queue", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, excerpt, quality_scores, topic_id, created_at")
        .eq("client_id", selectedClient.id)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
    enabled: !!selectedClient,
  });

  const approveMutation = useMutation({
    mutationFn: async (post: BlogPost) => {
      // Fetch suggested_publish_date from linked topic if available
      let scheduledFor: string | null = null;
      if (post.topic_id) {
        const { data: topic } = await supabase
          .from("blog_topics")
          .select("suggested_publish_date")
          .eq("id", post.topic_id)
          .maybeSingle();
        scheduledFor = topic?.suggested_publish_date ?? null;
      }

      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: "scheduled",
          scheduled_for: scheduledFor,
        })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post approved and scheduled");
      queryClient.invalidateQueries({ queryKey: ["blog-approval-queue", selectedClient?.id] });
      queryClient.invalidateQueries({ queryKey: ["blog-drafts-count", selectedClient?.id] });
    },
    onError: () => toast.error("Failed to approve post"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post rejected");
      setRejectPostId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["blog-approval-queue", selectedClient?.id] });
      queryClient.invalidateQueries({ queryKey: ["blog-drafts-count", selectedClient?.id] });
    },
    onError: () => toast.error("Failed to reject post"),
  });

  const handleRejectSubmit = () => {
    if (!rejectPostId) return;
    rejectMutation.mutate({ postId: rejectPostId, reason: rejectReason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No drafts awaiting approval</p>
        <p className="text-muted-foreground text-sm">
          When auto-mode generates posts, they'll appear here for your review before going live.
        </p>
      </div>
    );
  }

  return (
    <>
      {editingPostId && (
        <BlogArticleEditor
          blogPostId={editingPostId}
          open={true}
          onOpenChange={(open) => !open && setEditingPostId(null)}
          onSave={() => {
            setEditingPostId(null);
            queryClient.invalidateQueries({ queryKey: ["blog-approval-queue", selectedClient?.id] });
          }}
        />
      )}

      <Dialog
        open={!!rejectPostId}
        onOpenChange={(open) => {
          if (!open) {
            setRejectPostId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
          </DialogHeader>
          <textarea
            className="w-full border rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
            placeholder="Reason for rejection (optional)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectPostId(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {posts.map((post) => {
          const qs = post.quality_scores ?? {};
          const wordCount = qs.word_count;
          const h2Count = qs.h2_count;
          const internalLinks = qs.internal_links;
          const density = qs.primary_keyword_density;

          const densityGreen =
            density !== undefined && density >= 2.0 && density <= 2.5;
          const densityYellow =
            density !== undefined && !densityGreen;

          return (
            <Card key={post.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold leading-tight">{post.title}</h3>

                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <QualityBadge
                      label="Words"
                      value={wordCount}
                      green={wordCount !== undefined && wordCount >= 1000}
                    />
                    <QualityBadge
                      label="H2s"
                      value={h2Count}
                      green={h2Count !== undefined && h2Count >= 4}
                    />
                    <QualityBadge
                      label="Links"
                      value={internalLinks}
                      green={internalLinks !== undefined && internalLinks >= 5}
                    />
                    <QualityBadge
                      label="KW%"
                      value={density !== undefined ? `${density.toFixed(1)}%` : undefined}
                      green={densityGreen}
                      yellow={densityYellow}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => approveMutation.mutate(post)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectPostId(post.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingPostId(post.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
