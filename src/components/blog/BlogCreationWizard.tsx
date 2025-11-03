import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronRight, ChevronLeft, Check, Image as ImageIcon } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlogCreationWizardProps {
  onComplete?: () => void;
}

type Step = 'details' | 'outline' | 'article' | 'images' | 'review';

export function BlogCreationWizard({ onComplete }: BlogCreationWizardProps) {
  const { selectedClient } = useClient();
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [wordCount, setWordCount] = useState(1500);
  const [outline, setOutline] = useState<any>(null);
  const [blogPostId, setBlogPostId] = useState<string | null>(null);
  const [article, setArticle] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);

  const steps: Step[] = ['details', 'outline', 'article', 'images', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const addKeyword = () => {
    if (keywordInput.trim() && keywords.length < 5) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const generateOutline = async () => {
    if (!selectedClient || !title) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generate-outline', {
        body: {
          client_id: selectedClient.id,
          title,
          keywords,
          word_count: wordCount
        }
      });

      if (error) throw error;

      if (data.success) {
        setOutline(data.outline);
        setCurrentStep('outline');
        toast.success("Outline generated!");
      }
    } catch (error) {
      console.error('Error generating outline:', error);
      toast.error("Failed to generate outline");
    } finally {
      setLoading(false);
    }
  };

  const generateArticle = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('blog-generate-article', {
        body: {
          client_id: selectedClient.id,
          title,
          keywords,
          outline,
          word_count: wordCount,
          created_by: user?.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setArticle(data.article);
        setBlogPostId(data.blog_post_id);
        setCurrentStep('article');
        toast.success("Article generated!");
      }
    } catch (error) {
      console.error('Error generating article:', error);
      toast.error("Failed to generate article");
    } finally {
      setLoading(false);
    }
  };

  const generateImages = async () => {
    if (!blogPostId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generate-images', {
        body: {
          blog_post_id: blogPostId,
          num_images: 3
        }
      });

      if (error) throw error;

      if (data.success) {
        setImages(data.images);
        setCurrentStep('images');
        toast.success("Images generated!");
      }
    } catch (error) {
      console.error('Error generating images:', error);
      toast.error("Failed to generate images");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'details':
        await generateOutline();
        break;
      case 'outline':
        await generateArticle();
        break;
      case 'article':
        await generateImages();
        break;
      case 'images':
        setCurrentStep('review');
        break;
      case 'review':
        onComplete?.();
        break;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'details':
        return title.trim() !== "" && keywords.length > 0;
      case 'outline':
        return outline !== null;
      case 'article':
        return article !== null;
      case 'images':
        return images.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      <Card className="p-6">
        {currentStep === 'details' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-4">Blog Post Details</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your blog post title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (up to 5)</Label>
              <div className="flex gap-2">
                <Input
                  id="keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder="Add a keyword..."
                  disabled={keywords.length >= 5}
                />
                <Button onClick={addKeyword} disabled={keywords.length >= 5}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(index)}>
                    {keyword} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wordCount">Target Word Count: {wordCount}</Label>
              <input
                type="range"
                id="wordCount"
                min="500"
                max="3000"
                step="100"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {currentStep === 'outline' && outline && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Generated Outline</h3>
              <p className="text-sm text-muted-foreground">{outline.meta_description}</p>
            </div>

            <div className="space-y-3">
              {outline.sections?.map((section: any, index: number) => (
                <Card key={index} className="p-4">
                  <h4 className="font-semibold mb-2">{section.heading}</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    {section.key_points?.map((point: string, i: number) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                  {section.suggested_image && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {section.suggested_image}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'article' && article && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Article Generated</h3>
                <p className="text-sm text-muted-foreground">
                  {article.word_count} words • SEO Score: {article.seo_score}/100 • Readability: {article.readability_score}/100
                </p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>

            <Card className="p-4 max-h-96 overflow-y-auto">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </Card>
          </div>
        )}

        {currentStep === 'images' && images.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-4">Generated Images</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {images.map((image, index) => (
                <Card key={index} className="p-4">
                  <img 
                    src={image.url} 
                    alt={image.alt_text}
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                  <p className="text-sm font-medium">{image.type === 'featured' ? 'Featured Image' : `Body Image ${image.position}`}</p>
                  <p className="text-xs text-muted-foreground">{image.alt_text}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Ready to Publish</h3>
                <p className="text-sm text-muted-foreground">
                  Your blog post has been created and saved as a draft.
                </p>
              </div>
              <Check className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Title:</span>
                <span className="font-medium">{article?.title}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Word Count:</span>
                <span className="font-medium">{article?.word_count} words</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">SEO Score:</span>
                <span className="font-medium">{article?.seo_score}/100</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Images:</span>
                <span className="font-medium">{images.length} generated</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const prevIndex = Math.max(0, currentStepIndex - 1);
            setCurrentStep(steps[prevIndex]);
          }}
          disabled={currentStepIndex === 0 || loading}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed() || loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : currentStep === 'review' ? (
            'Complete'
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
