import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArticleCard } from "@/components/support-docs/ArticleCard";
import { searchArticles } from "@/components/support-docs/search";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BookOpen, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

export default function SupportDocsSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    fetchArticles();
  }, []);

  // Keep the input in sync if the URL ?q= changes (e.g. from the KB hero).
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("support_articles")
        .select(
          "id, title, slug, excerpt, content, category, tags, view_count, helpful_count, not_helpful_count",
        )
        .eq("is_published", true)
        .in("audience", ["client", "all"]);

      if (error) throw error;

      const rows: Article[] = (data || []).map((a) => ({
        ...a,
        excerpt: a.excerpt ?? "",
        content: a.content ?? "",
        tags: a.tags ?? [],
        view_count: a.view_count ?? 0,
        helpful_count: a.helpful_count ?? 0,
        not_helpful_count: a.not_helpful_count ?? 0,
      }));
      setArticles(rows);
    } catch (error: any) {
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const results = searchArticles(articles, query);

  const handleSubmit = () => {
    setSearchParams(query.trim() ? { q: query.trim() } : {});
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate("/support/docs")} className="cursor-pointer">
                  <BookOpen className="h-4 w-4 mr-2 inline" />
                  Knowledge Base
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Search</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-3xl font-bold mb-4">Search the Knowledge Base</h1>

          <div className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="pl-10"
                autoFocus
              />
            </div>
            <Button onClick={handleSubmit}>Search</Button>
            <Button variant="outline" onClick={() => navigate("/support/docs")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : !query.trim() ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Type a search term to find articles.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No results found</h2>
            <p className="text-muted-foreground">Try different or fewer keywords.</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              {results.length} result{results.length === 1 ? "" : "s"} for “{query.trim()}”
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => navigate(`/support/docs/${article.category}/${article.slug}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
