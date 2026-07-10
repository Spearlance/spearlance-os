import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArticleCard } from "@/components/support-docs/ArticleCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  BookOpen, 
  Search, 
  ArrowLeft,
  Rocket,
  Target,
  TrendingUp,
  HelpCircle,
  DollarSign,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

const categories = {
  getting_started: {
    id: "getting_started",
    name: "Getting Started",
    description: "New to the platform? Start here",
    icon: Rocket,
    color: "from-blue-500 to-blue-600"
  },
  features: {
    id: "features",
    name: "Features",
    description: "Learn about platform capabilities",
    icon: Target,
    color: "from-purple-500 to-purple-600"
  },
  marketing: {
    id: "marketing",
    name: "Marketing",
    description: "Campaign creation and management",
    icon: TrendingUp,
    color: "from-green-500 to-green-600"
  },
  troubleshooting: {
    id: "troubleshooting",
    name: "Troubleshooting",
    description: "Common issues and solutions",
    icon: HelpCircle,
    color: "from-orange-500 to-orange-600"
  },
  billing: {
    id: "billing",
    name: "Billing & Account",
    description: "Subscriptions and account settings",
    icon: DollarSign,
    color: "from-yellow-500 to-yellow-600"
  },
  best_practices: {
    id: "best_practices",
    name: "Best Practices",
    description: "Tips and strategies for success",
    icon: Lightbulb,
    color: "from-pink-500 to-pink-600"
  }
};

export default function SupportDocsCategory() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const categoryData = category ? categories[category as keyof typeof categories] : null;

  useEffect(() => {
    if (category) {
      fetchArticles();
    }
  }, [category]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredArticles(filtered);
    } else {
      setFilteredArticles(articles);
    }
  }, [searchQuery, articles]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("support_articles")
        .select("*")
        .eq("category", category)
        .eq("is_published", true)
        .in("audience", ["client", "all"])
        .order("published_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
      setFilteredArticles(data || []);
    } catch (error: any) {
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  if (!categoryData) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        <Button onClick={() => navigate("/support/docs")}>
          Back to Knowledge Base
        </Button>
      </div>
    );
  }

  const Icon = categoryData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
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
                <BreadcrumbPage>{categoryData.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Category Header */}
          <div className="flex items-start gap-6 mb-6">
            <div className={`p-4 rounded-lg bg-gradient-to-br ${categoryData.color} shadow-lg`}>
              <Icon className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{categoryData.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{categoryData.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{articles.length} articles</span>
              </div>
            </div>
          </div>

          {/* Search within category */}
          <div className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in this category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => navigate("/support/docs")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading articles...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">
              {searchQuery ? "No articles found" : "No articles yet"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Articles for this category will appear here soon"}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => navigate(`/support/docs/${article.category}/${article.slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
