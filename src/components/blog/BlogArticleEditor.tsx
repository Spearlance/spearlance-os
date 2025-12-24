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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useSaveStatus } from "@/hooks/useSaveStatus";

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
  const { setSaveStatus } = useSaveStatus();

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

      setSaveStatus('saved');
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="!w-[95vw] !max-w-none h-full overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Edit Article</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-6 h-[calc(100vh-120px)] mt-6">
            {/* Left Column - Full Height Editor */}
            <div className="flex-1 flex flex-col">
              <Tabs defaultValue="edit" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="edit" className="flex-1 data-[state=active]:flex flex-col">
                  <div className="border rounded-md overflow-hidden flex-1">
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-full bg-background"
                      placeholder="Write your article content here..."
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="preview" className="flex-1 overflow-y-auto p-6 border rounded-md bg-background data-[state=active]:block">
                  <article 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Metadata Sidebar */}
            <div className="w-80 border-l pl-6 overflow-y-auto space-y-6">
              {/* Action Buttons - Top */}
              <div className="flex flex-col gap-2 sticky top-0 bg-background pb-4 border-b z-10">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  variant="outline"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Draft</>
                  )}
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  Publish
                </Button>
              </div>

              {/* Metadata Badges */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{currentWordCount} words</span>
                </div>
                {metadata?.seo_score && (
                  <div className="flex items-center gap-2">
                    <Badge variant={metadata.seo_score >= 80 ? "default" : "secondary"}>
                      <BarChart className="h-3 w-3 mr-1" />
                      SEO: {metadata.seo_score}/100
                    </Badge>
                  </div>
                )}
                {metadata?.readability_score && (
                  <div className="flex items-center gap-2">
                    <Badge variant={metadata.readability_score >= 80 ? "default" : "secondary"}>
                      Read: {metadata.readability_score}/100
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{metadata?.status || 'draft'}</Badge>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title..."
                />
              </div>

              {/* Story Context */}
              <div className="space-y-2">
                <Label htmlFor="excerpt">Story Context & Personal Details</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Add real stories, case studies, specific examples, statistics, or personal anecdotes you want included in this article."
                />
                <p className="text-xs text-muted-foreground">
                  The more specific details you provide, the more authentic and unique the content will be.
                </p>
              </div>

              {/* Featured Image */}
              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image URL</Label>
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
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
