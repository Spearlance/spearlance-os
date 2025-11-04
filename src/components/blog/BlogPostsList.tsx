import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ExternalLink, Calendar, FileText } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { BlogArticleEditor } from "./BlogArticleEditor";

interface BlogPostsListProps {
  status: 'draft' | 'published' | 'scheduled';
}

export function BlogPostsList({ status }: BlogPostsListProps) {
  const { selectedClient } = useClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [selectedClient, status]);

  const loadPosts = async () => {
    if (!selectedClient) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('client_id', selectedClient.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success("Blog post deleted");
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error("Failed to delete blog post");
    }
  };

  const handleEdit = (postId: string) => {
    setEditingPostId(postId);
  };

  const handleEditorClose = () => {
    setEditingPostId(null);
    loadPosts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No {status} posts yet</p>
        <p className="text-muted-foreground">
          {status === 'draft' 
            ? 'Create your first blog post to get started' 
            : 'Publish a post to see it here'}
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
          onOpenChange={(open) => !open && handleEditorClose()}
          onSave={handleEditorClose}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <Card key={post.id} className="hover:shadow-lg transition-shadow overflow-hidden">
          {post.featured_image_url && (
            <img 
              src={post.featured_image_url} 
              alt={post.featured_image_alt || post.title}
              className="w-full h-48 object-cover"
            />
          )}
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">{post.title}</h3>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {post.word_count || 0} words
                </Badge>
                {post.seo_score && (
                  <Badge 
                    variant={post.seo_score >= 80 ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    SEO: {post.seo_score}
                  </Badge>
                )}
                {post.readability_score && (
                  <Badge 
                    variant={post.readability_score >= 80 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    Read: {post.readability_score}
                  </Badge>
                )}
              </div>

              {post.scheduled_for && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(post.scheduled_for), 'MMM d, yyyy')}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(post.id)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <div className="flex gap-1">
                  {post.duda_publish_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(post.duda_publish_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </>
  );
}
