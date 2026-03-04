import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryCard } from "@/components/support-docs/CategoryCard";
import { ArticleCard } from "@/components/support-docs/ArticleCard";
import { 
  BookOpen, 
  Search, 
  TrendingUp, 
  Clock, 
  Rocket,
  Target,
  BarChart3,
  FileText,
  DollarSign,
  Lightbulb,
  HelpCircle
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

const categories = [
  {
    id: "getting_started",
    name: "Getting Started",
    description: "New to the platform? Start here",
    icon: Rocket,
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "features",
    name: "Features",
    description: "Learn about platform capabilities",
    icon: Target,
    color: "from-purple-500 to-purple-600"
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Campaign creation and management",
    icon: TrendingUp,
    color: "from-green-500 to-green-600"
  },
  {
    id: "troubleshooting",
    name: "Troubleshooting",
    description: "Common issues and solutions",
    icon: HelpCircle,
    color: "from-orange-500 to-orange-600"
  },
  {
    id: "billing",
    name: "Billing & Account",
    description: "Subscriptions and account settings",
    icon: DollarSign,
    color: "from-yellow-500 to-yellow-600"
  },
  {
    id: "best_practices",
    name: "Best Practices",
    description: "Tips and strategies for success",
    icon: Lightbulb,
    color: "from-pink-500 to-pink-600"
  }
];

export default function SupportDocs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      // Fetch featured articles
      const { data: featured, error: featuredError } = await supabase
        .from("support_articles")
        .select("*")
        .eq("is_published", true)
        .not("featured_order", "is", null)
        .order("featured_order", { ascending: true })
        .limit(3);

      if (featuredError) throw featuredError;
      setFeaturedArticles(featured || []);

      // Fetch recent articles
      const { data: recent, error: recentError } = await supabase
        .from("support_articles")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(6);

      if (recentError) throw recentError;
      setRecentArticles(recent || []);

      // Get article counts by category
      const { data: counts, error: countsError } = await supabase
        .from("support_articles")
        .select("category")
        .eq("is_published", true);

      if (countsError) throw countsError;
      
      const countMap: Record<string, number> = {};
      counts?.forEach(article => {
        countMap[article.category] = (countMap[article.category] || 0) + 1;
      });
      setCategoryCounts(countMap);

    } catch (error: any) {
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/support/docs/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <BookOpen className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Knowledge Base
            </h1>
            
            <p className="text-xl text-muted-foreground">
              Everything you need to know about using our platform
            </p>

            {/* Search Bar */}
            <div className="flex gap-2 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button onClick={handleSearch} size="lg" className="h-12">
                Search
              </Button>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{Object.values(categoryCounts).reduce((a, b) => a + b, 0)} articles</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Helping users succeed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Categories Grid */}
        <section>
          <h2 className="text-3xl font-bold mb-8">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                articleCount={categoryCounts[category.id] || 0}
                onClick={() => navigate(`/support/docs/${category.id}`)}
              />
            ))}
          </div>
        </section>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">Featured Articles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => navigate(`/support/docs/${article.category}/${article.slug}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-8">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">Recent Articles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => navigate(`/support/docs/${article.category}/${article.slug}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Still Need Help CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Still need help?</CardTitle>
            <CardDescription>
              Can't find what you're looking for? Our support team is here to help.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/support")}>
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
