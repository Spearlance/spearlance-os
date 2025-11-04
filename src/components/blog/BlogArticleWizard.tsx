import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, Edit2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BlogArticleEditor } from "./BlogArticleEditor";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BlogArticleWizardProps {
  topic: {
    id: string;
    topic_title: string;
    summary: string | null;
    keywords?: string[];
    avatar_id?: string | null;
    client_id: string;
  };
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'outline' | 'generate' | 'edit';

export function BlogArticleWizard({ topic, onComplete, onCancel }: BlogArticleWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('outline');
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState<any>(null);
  const [blogPostId, setBlogPostId] = useState<string | null>(null);
  const [article, setArticle] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const steps: Step[] = ['outline', 'generate', 'edit'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const generateOutline = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('blog-generate-outline', {
        body: {
          client_id: topic.client_id,
          title: topic.topic_title,
          keywords: topic.keywords || [],
          avatar_id: topic.avatar_id,
          word_count: 1500
        }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      if (data.success) {
        setOutline(data.outline);
        setCurrentStep('outline');
        toast.success("Outline generated!");
      } else {
        throw new Error("Failed to generate outline");
      }
    } catch (error: any) {
      console.error('Error generating outline:', error);
      setError(error.message || "Failed to generate outline");
      toast.error("Failed to generate outline. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateArticle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: fnError } = await supabase.functions.invoke('blog-generate-article', {
        body: {
          topic_id: topic.id,
          client_id: topic.client_id,
          title: outline?.title || topic.topic_title,
          meta_description: outline?.meta_description || topic.summary,
          keywords: topic.keywords || [],
          outline,
          avatar_id: topic.avatar_id,
          created_by: user?.id
        }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      if (data.success) {
        setArticle(data.article);
        setBlogPostId(data.blog_post_id);
        setCurrentStep('edit');
        toast.success("Article generated!");
      } else {
        throw new Error("Failed to generate article");
      }
    } catch (error: any) {
      console.error('Error generating article:', error);
      setError(error.message || "Failed to generate article");
      toast.error("Failed to generate article. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate outline on mount
  useState(() => {
    if (!outline && !loading) {
      generateOutline();
    }
  });

  const handleOutlineEdit = (field: string, value: string) => {
    setOutline((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSectionEdit = (index: number, field: string, value: any) => {
    setOutline((prev: any) => ({
      ...prev,
      sections: prev.sections.map((section: any, i: number) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {currentStep === 'outline' && 'Step 1: Review Structure'}
            {currentStep === 'generate' && 'Step 2: Generate Article'}
            {currentStep === 'edit' && 'Step 3: Edit & Review'}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 1: Outline Preview */}
      {currentStep === 'outline' && (
        <Card className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Generating structure...</p>
            </div>
          ) : outline ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Edit2 className="h-5 w-5" />
                  Article Structure
                </h3>
              </div>

              <div className="space-y-2">
                <Label>Optimized Title</Label>
                <Textarea
                  value={outline.title || topic.topic_title}
                  onChange={(e) => handleOutlineEdit('title', e.target.value)}
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={outline.meta_description || ''}
                  onChange={(e) => handleOutlineEdit('meta_description', e.target.value)}
                  className="min-h-[80px]"
                  placeholder="150-160 characters for SEO"
                />
                <p className="text-xs text-muted-foreground">
                  {outline.meta_description?.length || 0}/160 characters
                </p>
              </div>

              <div className="space-y-3">
                <Label>Sections</Label>
                {outline.sections?.map((section: any, index: number) => (
                  <Card key={index} className="p-4 bg-muted/50">
                    <Textarea
                      value={section.heading}
                      onChange={(e) => handleSectionEdit(index, 'heading', e.target.value)}
                      className="font-semibold mb-2 min-h-[40px]"
                    />
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {section.key_points?.map((point: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                    {section.word_count_target && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Target: ~{section.word_count_target} words
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Click "Generate Outline" to start</p>
            </div>
          )}
        </Card>
      )}

      {/* STEP 2: Generate Article */}
      {currentStep === 'generate' && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Writing Your Article</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Our AI is crafting your article based on the approved structure. This may take 30-60 seconds...
            </p>
            <div className="mt-6 w-full max-w-sm">
              <Progress value={66} className="h-2" />
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: Edit & Review */}
      {currentStep === 'edit' && article && blogPostId && (
        <BlogArticleEditor
          blogPostId={blogPostId}
          initialContent={article.content}
          initialTitle={article.title}
          onSave={onComplete}
          onCancel={onCancel}
        />
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep === 'outline') {
              onCancel();
            } else if (currentStep === 'generate') {
              setCurrentStep('outline');
            }
          }}
          disabled={loading || currentStep === 'edit'}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStep === 'outline' ? 'Cancel' : 'Back'}
        </Button>

        {currentStep === 'outline' && outline && !loading && (
          <Button onClick={() => {
            setCurrentStep('generate');
            generateArticle();
          }}>
            <Check className="w-4 h-4 mr-2" />
            Approve & Write Article
          </Button>
        )}

        {currentStep === 'outline' && !outline && !loading && (
          <Button onClick={generateOutline}>
            Generate Outline
          </Button>
        )}

        {currentStep === 'outline' && loading && (
          <Button disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </Button>
        )}
      </div>
    </div>
  );
}
