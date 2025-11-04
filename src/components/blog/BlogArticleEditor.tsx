import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X, FileText, BarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface BlogArticleEditorProps {
  blogPostId: string;
  initialContent?: string;
  initialTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function BlogArticleEditor({ 
  blogPostId, 
  initialContent = '', 
  initialTitle = '',
  open,
  onOpenChange,
  onSave
}: BlogArticleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [excerpt, setExcerpt] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    loadPost();
  }, [blogPostId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', blogPostId)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setContent(data.content || '');
        setExcerpt(data.excerpt || '');
        setFeaturedImageUrl(data.featured_image_url || '');
        
        // Calculate word count from content
        const plainText = (data.content || '').replace(/<[^>]*>/g, '');
        const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
        
        setMetadata({
          word_count: wordCount,
          seo_score: data.seo_score,
          readability_score: data.readability_score,
          status: data.status
        });
      }
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const calculateWordCount = (text: string) => {
    // Remove HTML tags for accurate word count
    const plainText = text.replace(/<[^>]*>/g, '');
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSave = async (publishNow = false) => {
    setSaving(true);
    try {
      const wordCount = calculateWordCount(content);
      
      const { error } = await supabase
        .from('blog_posts')
        .update({
          title,
          content,
          excerpt,
          featured_image_url: featuredImageUrl || null,
          status: publishNow ? 'published' : metadata?.status || 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', blogPostId);

      if (error) throw error;

      toast.success(publishNow ? "Article published!" : "Changes saved!");
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const currentWordCount = calculateWordCount(content);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Article</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metadata Bar */}
            <div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{currentWordCount} words</span>
                </div>
                {metadata?.seo_score && (
                  <Badge variant={metadata.seo_score >= 80 ? "default" : "secondary"}>
                    <BarChart className="h-3 w-3 mr-1" />
                    SEO: {metadata.seo_score}/100
                  </Badge>
                )}
                {metadata?.readability_score && (
                  <Badge variant={metadata.readability_score >= 80 ? "default" : "secondary"}>
                    Read: {metadata.readability_score}/100
                  </Badge>
                )}
                <Badge variant="outline">{metadata?.status || 'draft'}</Badge>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Draft</>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  Publish
                </Button>
              </div>
            </div>

            {/* Basic Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold h-auto py-3"
                  placeholder="Article title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Story Context & Personal Details (optional)</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="min-h-[150px]"
                  placeholder="Add real stories, case studies, specific examples, statistics, or personal anecdotes you want included in this article. The more specific details you provide, the more authentic and unique the content will be."
                />
                <p className="text-xs text-muted-foreground">
                  Examples: "Include the story about how we helped ABC Company reduce costs by 50%" or "Mention our founder's 15 years of experience in the industry" or "Reference our recent survey showing 80% of customers saw results in 30 days"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image URL (optional)</Label>
                <Input
                  id="featuredImage"
                  value={featuredImageUrl}
                  onChange={(e) => setFeaturedImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                {featuredImageUrl && (
                  <img 
                    src={featuredImageUrl} 
                    alt="Featured" 
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>

            {/* Content Editor with Tabs */}
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <div className="border rounded-md overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={quillModules}
                    formats={quillFormats}
                    className="min-h-[60vh] bg-background"
                    placeholder="Write your article content here..."
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the toolbar above to format your text. Current word count: {currentWordCount}
                </p>
              </TabsContent>
              
              <TabsContent value="preview" className="min-h-[60vh] p-6 border rounded-md bg-background">
                <article 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </TabsContent>
            </Tabs>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button onClick={() => handleSave(false)} disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
