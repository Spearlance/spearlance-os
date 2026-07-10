import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Printer,
  ArrowLeft,
  Lock,
  FileWarning,
  Languages,
  Loader2,
  Sparkles,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { ArticleMarkdown } from "@/components/support-docs/ArticleMarkdown";
import { ArticleEditor } from "@/components/support-docs/ArticleEditor";
import { getCategoryName } from "@/components/support-docs/categories";
import { useCategories } from "@/hooks/useCategories";
import { useUserRole } from "@/hooks/useUserRole";
import {
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  SOURCE_LANG,
  isRtlLang,
  isTranslatable,
  languageLabel,
} from "@/components/support-docs/languages";
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
  audience: string;
  is_published: boolean;
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
  const { isAdmin } = useUserRole();
  // Hydrate the category registry so the breadcrumb reflects DB names/edits.
  useCategories();
  const [showEditor, setShowEditor] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [lang, setLang] = useState<string>(
    () => localStorage.getItem(LANGUAGE_STORAGE_KEY) || SOURCE_LANG,
  );
  const [translation, setTranslation] = useState<{ title: string; content: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (category && slug) {
      fetchArticle();
    }
  }, [category, slug]);

  const fetchArticle = async () => {
    if (!slug) return;

    try {
      // Fetch article. No is_published filter here — RLS is the boundary:
      // admins receive drafts, everyone else gets null for an unpublished row.
      const { data: articleData, error: articleError } = await supabase
        .from("support_articles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (articleError) throw articleError;
      setArticle(articleData);

      // Track view — only for published articles, so admin draft previews
      // don't inflate the read counts we use to see what the team actually reads.
      const { data: { user } } = await supabase.auth.getUser();
      if (user && articleData && articleData.is_published) {
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
          .eq("audience", articleData.audience)
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

  // Fetch (or reset) the translation whenever the article or language changes.
  // Only internal SOPs are translatable for now.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!article || !isTranslatable(lang) || article.audience !== "internal") {
        setTranslation(null);
        return;
      }
      setTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke("translate-article", {
          body: { article_id: article.id, lang },
        });
        if (error) throw error;
        if (!data?.content) throw new Error(data?.error || "No translation returned");
        if (!cancelled) setTranslation({ title: data.title, content: data.content });
      } catch (err) {
        if (!cancelled) {
          toast.error("Translation failed — showing English");
          setTranslation(null);
          setLang(SOURCE_LANG);
          localStorage.setItem(LANGUAGE_STORAGE_KEY, SOURCE_LANG);
        }
      } finally {
        if (!cancelled) setTranslating(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [article?.id, article?.audience, lang]);

  const handleLangChange = (value: string) => {
    setLang(value);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
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

  // A shared reader serves both surfaces; it adapts to the article's audience.
  const isInternal = article.audience === "internal";
  const basePath = isInternal ? "/sop" : "/support/docs";
  const rootLabel = isInternal ? "SOP Library" : "Knowledge Base";
  const isDraft = !article.is_published;
  const isRtl = isRtlLang(lang);
  const displayTitle = translation?.title ?? article.title;
  const displayContent = translation?.content ?? article.content;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(basePath)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {rootLabel}
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={basePath} className="hover:text-foreground">
            {rootLabel}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`${basePath}/${article.category}`} className="hover:text-foreground">
            {getCategoryName(article.category)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{article.title}</span>
        </div>

        {/* Draft banner (admins only — RLS won't return drafts to anyone else) */}
        {isDraft && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <FileWarning className="h-4 w-4 shrink-0" />
            <span>
              <strong>Draft</strong> — this article is unpublished and not visible to the team yet.
            </span>
          </div>
        )}

        {/* Article Header */}
        <div className={isInternal ? "mb-8 border-l-4 border-l-amber-500 pl-4" : "mb-8"}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            {isInternal ? (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1"
              >
                <Lock className="h-3 w-3" />
                Internal SOP — not client-facing
              </Badge>
            ) : (
              <span />
            )}

            {/* Right cluster: translation switcher (internal only) + admin edit */}
            <div className="flex items-center gap-2">
              {isInternal && (
                <div className="flex items-center gap-2">
                  {translating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Languages className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Select value={lang} onValueChange={handleLangChange}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.code || "en"} value={l.code}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowEditor(true)}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4" dir={isRtl ? "rtl" : "ltr"}>{displayTitle}</h1>

          {translation && (
            <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              AI-translated to {languageLabel(lang)} — the copy-paste prompts stay in English.
            </div>
          )}

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
        <ArticleMarkdown
          content={displayContent}
          className="prose-lg mb-12"
          dir={isRtl ? "rtl" : "ltr"}
        />

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
                  onClick={() => navigate(`${basePath}/${related.category}/${related.slug}`)}
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

        {isAdmin && showEditor && (
          <ArticleEditor
            article={article}
            open={showEditor}
            onClose={() => setShowEditor(false)}
            onSave={() => {
              setShowEditor(false);
              fetchArticle();
            }}
          />
        )}
      </div>
    </div>
  );
}
