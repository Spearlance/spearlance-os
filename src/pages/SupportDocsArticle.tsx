import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronRight, 
  Clock, 
  Eye, 
  ThumbsUp, 
  ThumbsDown,
  Share2,
  Printer,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useClient } from "@/contexts/ClientContext";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  updated_at: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
}

export default function SupportDocsArticle() {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  useEffect(() => {
    if (category && slug) {
      fetchArticle();
    }
  }, [category, slug]);

  const fetchArticle = async () => {
    if (!slug) return;

    try {
      // Fetch article
      const { data: articleData, error: articleError } = await supabase
        .from("support_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (articleError) throw articleError;
      setArticle(articleData);

      // Track view
      const { data: { user } } = await supabase.auth.getUser();
      if (user && articleData) {
        await supabase.from("support_article_views").insert({
          article_id: articleData.id,
          user_id: user.id,
        });

        // Increment view count
        await supabase
          .from("support_articles")
          .update({ view_count: (articleData.view_count || 0) + 1 })
          .eq("id", articleData.id);
      }

      // Fetch related articles
      if (articleData) {
        const { data: related, error: relatedError } = await supabase
          .from("support_articles")
          .select("id, title, slug, category, excerpt")
          .eq("category", articleData.category)
          .eq("is_published", true)
          .neq("id", articleData.id)
          .limit(3);

        if (!relatedError && related) {
          setRelatedArticles(related);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load article");
      navigate("/support/docs");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!article) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to provide feedback");
        return;
      }

      // Insert feedback
      const { error } = await supabase
        .from("support_article_feedback")
        .insert({
          article_id: article.id,
          user_id: user.id,
          is_helpful: helpful,
        });

      if (error) throw error;

      // Update article counts
      const updateField = helpful ? "helpful_count" : "not_helpful_count";
      const currentCount = helpful ? article.helpful_count : article.not_helpful_count;
      
      await supabase
        .from("support_articles")
        .update({ [updateField]: currentCount + 1 })
        .eq("id", article.id);

      setFeedback(helpful);
      toast.success("Thank you for your feedback!");
    } catch (error: any) {
      toast.error("Failed to submit feedback");
    }
  };

  const getCategoryName = (cat: string) => {
    const names: Record<string, string> = {
      getting_started: "Getting Started",
      features: "Features",
      marketing: "Marketing",
      troubleshooting: "Troubleshooting",
      billing: "Billing & Account",
      best_practices: "Best Practices"
    };
    return names[cat] || cat;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="space-y-2 pt-8">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <Button onClick={() => navigate("/support/docs")}>
            Back to Knowledge Base
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/support/docs")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Base
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/support/docs" className="hover:text-foreground">
            Knowledge Base
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/support/docs/${article.category}`} className="hover:text-foreground">
            {getCategoryName(article.category)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{article.title}</span>
        </div>

        {/* Article Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{article.view_count} views</span>
            </div>
            <div className="flex gap-2">
              {article.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Article Content */}
        <div className="prose prose-lg max-w-none mb-12">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <Separator className="mb-8" />

        {/* Feedback Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Was this article helpful?</CardTitle>
          </CardHeader>
          <CardContent>
            {feedback === null ? (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes, this helped
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No, I need more help
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground">
                Thank you for your feedback!
                {!feedback && (
                  <div className="mt-4">
                    <Button onClick={() => navigate("/support")}>
                      Contact Support
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Related Articles</h2>
            <div className="grid gap-4">
              {relatedArticles.map((related) => (
                <Card
                  key={related.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/support/docs/${related.category}/${related.slug}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{related.title}</CardTitle>
                    <CardDescription>{related.excerpt}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Still Need Help */}
        <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Still need help?</CardTitle>
            <CardDescription>
              Contact our support team for personalized assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/support")}>
              Create Support Ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
