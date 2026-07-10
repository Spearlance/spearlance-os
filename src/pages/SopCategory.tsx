import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArticleCard } from "@/components/support-docs/ArticleCard";
import { resolveCategory } from "@/components/support-docs/categories";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BookOpen, Search, ArrowLeft, Lock } from "lucide-react";
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

export default function SopCategory() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [sops, setSops] = useState<Sop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // No hardcoded lookup — resolveCategory always returns sensible presentation
  // metadata (title-cased fallback for unknown slugs), so this page never
  // renders a "category not found" dead end.
  const categoryData = category ? resolveCategory(category) : null;
  const Icon = categoryData?.icon ?? BookOpen;

  useEffect(() => {
    if (category) {
      fetchSops();
    }
  }, [category]);

  const fetchSops = async () => {
    try {
      const { data, error } = await supabase
        .from("support_articles")
        .select(
          "id, title, slug, excerpt, category, tags, view_count, helpful_count, not_helpful_count, is_published",
        )
        .eq("audience", "internal")
        .eq("category", category)
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

  const filtered = searchQuery.trim()
    ? sops.filter(
        (sop) =>
          sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sop.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sop.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : sops;

  if (!categoryData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate("/sop")} className="cursor-pointer">
                  <BookOpen className="h-4 w-4 mr-2 inline" />
                  SOP Library
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{categoryData.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-start gap-6 mb-6">
            <div className={`p-4 rounded-lg bg-gradient-to-br ${categoryData.color} shadow-lg`}>
              <Icon className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{categoryData.name}</h1>
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1"
                >
                  <Lock className="h-3 w-3" />
                  Internal
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">{categoryData.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{sops.length} SOPs</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in this area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => navigate("/sop")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* SOPs */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading SOPs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">
              {searchQuery ? "No SOPs found" : "No SOPs yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search terms"
                : "SOPs for this area will appear here soon"}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((sop) => (
              <ArticleCard
                key={sop.id}
                article={sop}
                variant="internal"
                onClick={() => navigate(`/sop/${sop.category}/${sop.slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
