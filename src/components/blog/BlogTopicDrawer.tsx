import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlogTopic {
  id: string;
  topic_title: string;
  summary: string | null;
  category: string | null;
  suggested_publish_date: string;
  status: string;
  client_id: string;
  blog_posts: any;
  keywords?: string[];
  avatar_id?: string | null;
}

interface BlogTopicDrawerProps {
  topic: BlogTopic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export const BlogTopicDrawer = ({ topic, open, onOpenChange, onRefresh }: BlogTopicDrawerProps) => {
  const [generating, setGenerating] = useState(false);

  if (!topic) return null;

  const posts = topic.blog_posts ? (Array.isArray(topic.blog_posts) ? topic.blog_posts : [topic.blog_posts]) : [];
  const hasArticle = posts.length > 0 && posts[0];

  const handleGenerateArticle = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('blog-generate-article', {
        body: { 
          topic_id: topic.id,
          client_id: topic.client_id,
          title: topic.topic_title,
          meta_description: topic.summary,
          keywords: topic.keywords || [],
          avatar_id: topic.avatar_id
        },
      });

      if (error) throw error;

      toast.success("Article generated successfully!");
      onRefresh();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error generating article:', error);
      toast.error(error.message || "Failed to generate article.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{topic.topic_title}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{topic.category || 'General'}</Badge>
            <Badge>
              {hasArticle ? (
                posts[0].status === 'published' ? '✓ Published' :
                posts[0].status === 'scheduled' ? '⏰ Scheduled' :
                '📝 Draft'
              ) : 'Idea Only'}
            </Badge>
          </div>

          {topic.summary && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{topic.summary}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-2">Suggested Publish Date</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(topic.suggested_publish_date).toLocaleDateString('default', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {hasArticle && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Article</h3>
              <p className="text-sm text-muted-foreground">{posts[0].title}</p>
            </div>
          )}

          <div className="flex gap-2">
            {!hasArticle && (
              <Button
                onClick={handleGenerateArticle}
                disabled={generating}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  'Generate Article'
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};