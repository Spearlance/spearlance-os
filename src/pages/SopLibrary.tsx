import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryCard } from "@/components/support-docs/CategoryCard";
import { ArticleCard } from "@/components/support-docs/ArticleCard";
import { deriveCategories } from "@/components/support-docs/categories";
import { BookOpen, Lock, Clock, Terminal, FileText } from "lucide-react";
import { toast } from "sonner";

interface Sop {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  is_published: boolean;
}

export default function SopLibrary() {
  const navigate = useNavigate();
  const [sops, setSops] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSops();
  }, []);

  const fetchSops = async () => {
    try {
      // RLS is the security boundary: clients/anon receive zero internal rows,
      // so this whole surface fails safe if reached by URL. The audience filter
      // is presentation only — it keeps the client KB and SOP library separate.
      const { data, error } = await supabase
        .from("support_articles")
        .select(
          "id, title, slug, excerpt, category, tags, view_count, helpful_count, not_helpful_count, is_published",
        )
        .eq("audience", "internal")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const rows: Sop[] = (data || []).map((a) => ({
        ...a,
        excerpt: a.excerpt ?? "",
        tags: a.tags ?? [],
        view_count: a.view_count ?? 0,
        helpful_count: a.helpful_count ?? 0,
        not_helpful_count: a.not_helpful_count ?? 0,
        is_published: a.is_published ?? false,
      }));
      setSops(rows);
    } catch (error: any) {
      toast.error("Failed to load SOPs");
    } finally {
      setLoading(false);
    }
  };

  // Category tabs are derived from the rows actually returned — never a
  // hardcoded list — so a grouping only ever appears when the viewer can see
  // at least one SOP in it.
  const categories = deriveCategories(sops);
  const countByCategory = sops.reduce<Record<string, number>>((acc, sop) => {
    acc[sop.category] = (acc[sop.category] || 0) + 1;
    return acc;
  }, {});
  const recent = sops.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-background border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-amber-500/10 rounded-full">
                <BookOpen className="h-12 w-12 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="flex justify-center">
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1"
              >
                <Lock className="h-3 w-3" />
                Internal — staff only
              </Badge>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              SOP Library
            </h1>

            <p className="text-xl text-muted-foreground">
              How the Spearlance team runs the work. Every SOP leads with a
              copy-paste kickoff prompt — paste it into Claude and go.
            </p>

            <div className="flex justify-center gap-8 text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{sops.length} SOPs</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <span>Prompt-first workflows</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading SOPs...</p>
          </div>
        ) : sops.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No SOPs yet</h2>
            <p className="text-muted-foreground">
              Internal SOPs will appear here once they're published.
            </p>
          </div>
        ) : (
          <>
            {/* Categories */}
            <section>
              <h2 className="text-3xl font-bold mb-8">Browse by area</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    articleCount={countByCategory[category.id] || 0}
                    onClick={() => navigate(`/sop/${category.id}`)}
                  />
                ))}
              </div>
            </section>

            {/* Recent */}
            {recent.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-8">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-3xl font-bold">Recently updated</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recent.map((sop) => (
                    <ArticleCard
                      key={sop.id}
                      article={sop}
                      variant="internal"
                      onClick={() => navigate(`/sop/${sop.category}/${sop.slug}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
