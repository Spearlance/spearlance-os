import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, ExternalLink, Calendar } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface BlogPostsListProps {
  status: 'draft' | 'published' | 'scheduled';
}

export function BlogPostsList({ status }: BlogPostsListProps) {
  const { selectedClient } = useClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          No {status} blog posts yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <Card key={post.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{post.title}</h3>
                <Badge variant={status === 'published' ? 'default' : 'secondary'}>
                  {status}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {post.excerpt}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{post.word_count || 0} words</span>
                {post.seo_score && <span>SEO: {post.seo_score}/100</span>}
                {post.readability_score && <span>Readability: {post.readability_score}/100</span>}
                {post.scheduled_for && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(post.scheduled_for), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {post.duda_publish_url && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={post.duda_publish_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button size="sm" variant="ghost">
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleDelete(post.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {post.featured_image_url && (
            <img 
              src={post.featured_image_url} 
              alt={post.featured_image_alt || post.title}
              className="w-full h-48 object-cover rounded-lg mt-4"
            />
          )}
        </Card>
      ))}
    </div>
  );
}
