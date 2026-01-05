import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, Copy, Check, AlertCircle, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

type Step = 'generating' | 'ready';

interface ArticleBrief {
  site_info: {
    site_id: string;
    website_url: string;
  };
  article_brief: {
    title: string;
    topic_summary: string;
    connection_to_brand: string;
    relevant_context: {
      target_audience: string;
      pain_points_addressed: string[];
      value_props_to_highlight: string[];
      services_to_mention: string[];
      competitive_advantages: string[];
    };
  };
  outline: {
    meta_description: string;
    sections: {
      heading: string;
      subheadings?: string[];
      key_points: string[];
      word_count_target: number;
    }[];
    seo_recommendations: string[];
    internal_link_opportunities: string[];
  };
}

export function BlogArticleWizard({ topic, onComplete, onCancel }: BlogArticleWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('generating');
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<ArticleBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const progress = currentStep === 'generating' ? 50 : 100;

  const generateBrief = async () => {
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

      if (data.success && data.brief) {
        setBrief(data.brief);
        setCurrentStep('ready');
        toast.success("Brief generated!");
      } else {
        throw new Error("Failed to generate brief");
      }
    } catch (error: any) {
      console.error('Error generating brief:', error);
      setError(error.message || "Failed to generate brief");
      toast.error("Failed to generate brief. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    if (!brief && !loading) {
      generateBrief();
    }
  }, []);

  const formatBriefForCopy = (): string => {
    if (!brief) return '';

    const lines: string[] = [];

    // Site Information
    lines.push('## DUDA SITE INFORMATION');
    lines.push(`- Site ID: ${brief.site_info.site_id}`);
    lines.push(`- Website URL: ${brief.site_info.website_url}`);
    lines.push('');

    // Article Brief
    lines.push('## BLOG ARTICLE BRIEF');
    lines.push('');
    lines.push(`### Topic: ${brief.article_brief.title}`);
    lines.push(brief.article_brief.topic_summary);
    lines.push('');

    lines.push('### Connection to Brand');
    lines.push(brief.article_brief.connection_to_brand);
    lines.push('');

    lines.push('### Target Audience Context');
    lines.push(`**Target Audience:** ${brief.article_brief.relevant_context.target_audience}`);
    lines.push('');

    if (brief.article_brief.relevant_context.pain_points_addressed?.length) {
      lines.push('**Pain Points Addressed:**');
      brief.article_brief.relevant_context.pain_points_addressed.forEach(p => lines.push(`- ${p}`));
      lines.push('');
    }

    if (brief.article_brief.relevant_context.value_props_to_highlight?.length) {
      lines.push('**Value Propositions to Highlight:**');
      brief.article_brief.relevant_context.value_props_to_highlight.forEach(v => lines.push(`- ${v}`));
      lines.push('');
    }

    if (brief.article_brief.relevant_context.services_to_mention?.length) {
      lines.push('**Services to Reference:**');
      brief.article_brief.relevant_context.services_to_mention.forEach(s => lines.push(`- ${s}`));
      lines.push('');
    }

    if (brief.article_brief.relevant_context.competitive_advantages?.length) {
      lines.push('**Competitive Advantages:**');
      brief.article_brief.relevant_context.competitive_advantages.forEach(a => lines.push(`- ${a}`));
      lines.push('');
    }

    // Outline
    lines.push('## BLOG OUTLINE');
    lines.push('');
    lines.push('### Meta Description');
    lines.push(brief.outline.meta_description);
    lines.push('');

    lines.push('### Sections');
    brief.outline.sections.forEach((section, index) => {
      lines.push(`${index + 1}. **${section.heading}** (~${section.word_count_target} words)`);
      if (section.subheadings?.length) {
        section.subheadings.forEach(sub => lines.push(`   - ${sub}`));
      }
      section.key_points.forEach(point => lines.push(`   - ${point}`));
      lines.push('');
    });

    if (brief.outline.seo_recommendations?.length) {
      lines.push('### SEO Recommendations');
      brief.outline.seo_recommendations.forEach(rec => lines.push(`- ${rec}`));
      lines.push('');
    }

    if (brief.outline.internal_link_opportunities?.length) {
      lines.push('### Internal Link Opportunities');
      brief.outline.internal_link_opportunities.forEach(link => lines.push(`- ${link}`));
    }

    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = formatBriefForCopy();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {currentStep === 'generating' && 'Generating Brief...'}
            {currentStep === 'ready' && 'Brief Ready - Copy for Claude'}
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

      {/* Generating State */}
      {currentStep === 'generating' && loading && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing brand context and generating brief...</p>
          </div>
        </Card>
      )}

      {/* Brief Ready State */}
      {currentStep === 'ready' && brief && (
        <div className="space-y-4">
          {/* Site Info Card */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-primary">Duda Site Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Site ID:</span>
                <code className="ml-2 px-2 py-1 bg-muted rounded font-mono">{brief.site_info.site_id}</code>
              </div>
              <div>
                <span className="text-muted-foreground">URL:</span>
                <code className="ml-2 px-2 py-1 bg-muted rounded font-mono text-xs">{brief.site_info.website_url}</code>
              </div>
            </div>
          </Card>

          {/* Article Brief Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" />
              <h3 className="font-semibold">Article Brief</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Topic</h4>
                <p className="font-semibold">{brief.article_brief.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{brief.article_brief.topic_summary}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Brand Connection</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{brief.article_brief.connection_to_brand}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Relevant Context</h4>
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Target Audience:</span>
                    <span className="ml-2">{brief.article_brief.relevant_context.target_audience}</span>
                  </div>
                  {brief.article_brief.relevant_context.pain_points_addressed?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Pain Points:</span>
                      <span className="ml-2">{brief.article_brief.relevant_context.pain_points_addressed.join(', ')}</span>
                    </div>
                  )}
                  {brief.article_brief.relevant_context.services_to_mention?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Services:</span>
                      <span className="ml-2">{brief.article_brief.relevant_context.services_to_mention.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Outline Card */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Blog Outline</h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-1">Meta Description</h4>
                <p className="text-sm text-muted-foreground">{brief.outline.meta_description}</p>
                <p className="text-xs text-muted-foreground mt-1">{brief.outline.meta_description?.length || 0}/160 characters</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Sections</h4>
                <div className="space-y-2">
                  {brief.outline.sections.map((section, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{index + 1}. {section.heading}</span>
                        <span className="text-xs text-muted-foreground">~{section.word_count_target} words</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {section.key_points.map((point, i) => (
                          <li key={i}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {brief.outline.seo_recommendations?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">SEO Recommendations</h4>
                  <ul className="text-sm text-muted-foreground">
                    {brief.outline.seo_recommendations.map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>

        {currentStep === 'ready' && brief && (
          <Button onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy for Claude
              </>
            )}
          </Button>
        )}

        {currentStep === 'generating' && !loading && !brief && (
          <Button onClick={generateBrief}>
            Generate Brief
          </Button>
        )}

        {loading && (
          <Button disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </Button>
        )}
      </div>
    </div>
  );
}
