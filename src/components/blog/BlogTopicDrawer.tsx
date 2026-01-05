import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlogArticleWizard } from "./BlogArticleWizard";
import { BlogArticleEditor } from "./BlogArticleEditor";
import { parseUTCDate } from "@/lib/utils";
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
  const [showWizard, setShowWizard] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  if (!topic) return null;

  const posts = topic.blog_posts ? (Array.isArray(topic.blog_posts) ? topic.blog_posts : [topic.blog_posts]) : [];
  const hasArticle = posts.length > 0 && posts[0];

  const calculateWordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  };

  const handleStartWizard = () => {
    setShowWizard(true);
  };

  const handleOpenEditor = () => {
    setShowEditor(true);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    onRefresh();
    onOpenChange(false);
  };

  const handleEditorSave = () => {
    setShowEditor(false);
    onRefresh();
    onOpenChange(false);
  };

  const handleWizardCancel = () => {
    setShowWizard(false);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={showWizard ? "w-[90vw] max-w-[1400px]" : "w-[400px] sm:w-[540px]"} style={{ overflowY: 'auto' }}>
          <SheetHeader>
            <SheetTitle>
              {showWizard ? 'Create Article' : topic.topic_title}
            </SheetTitle>
          </SheetHeader>
          
          {showWizard ? (
            <div className="mt-6">
              <BlogArticleWizard
                topic={topic}
                onComplete={handleWizardComplete}
                onCancel={handleWizardCancel}
              />
            </div>
          ) : (
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
              {parseUTCDate(topic.suggested_publish_date).toLocaleDateString('default', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {hasArticle && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2">Article Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium text-right max-w-[280px] truncate">{posts[0].title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Word Count:</span>
                    <span className="font-medium">{calculateWordCount(posts[0].content || '')} words</span>
                  </div>
                  {posts[0].seo_score && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SEO Score:</span>
                      <span className="font-medium">{posts[0].seo_score}/100</span>
                    </div>
                  )}
                  {posts[0].readability_score && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Readability:</span>
                      <span className="font-medium">{posts[0].readability_score}/100</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{new Date(posts[0].created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="font-medium">{new Date(posts[0].updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

            {posts[0].excerpt && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Story Context</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{posts[0].excerpt}</p>
              </div>
            )}

              {posts[0].featured_image_url && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Featured Image</h3>
                  <img 
                    src={posts[0].featured_image_url} 
                    alt="Featured" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 pt-2 border-t">
            {!hasArticle ? (
              <Button onClick={handleStartWizard} className="flex-1">
                Generate Article
              </Button>
            ) : (
              <Button onClick={handleOpenEditor} className="flex-1">
                Edit Article
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor Dialog - rendered separately from Sheet */}
      {hasArticle && (
        <BlogArticleEditor
          blogPostId={posts[0].id}
          initialContent={posts[0].content}
          initialTitle={posts[0].title}
          open={showEditor}
          onOpenChange={setShowEditor}
          onSave={handleEditorSave}
        />
      )}
    </>
  );
};