import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ThumbsUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  is_published?: boolean;
}

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
  /** "internal" adds an amber accent + Internal badge for staff-only SOPs. */
  variant?: "client" | "internal";
}

export function ArticleCard({ article, onClick, variant = "client" }: ArticleCardProps) {
  const helpfulRatio = article.helpful_count + article.not_helpful_count > 0
    ? Math.round((article.helpful_count / (article.helpful_count + article.not_helpful_count)) * 100)
    : 0;

  const isInternal = variant === "internal";
  const isDraft = article.is_published === false;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 group h-full",
        isInternal && "border-l-4 border-l-amber-500",
      )}
      onClick={onClick}
    >
      <CardHeader>
        {(isInternal || isDraft) && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isInternal && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1"
              >
                <Lock className="h-3 w-3" />
                Internal
              </Badge>
            )}
            {isDraft && (
              <Badge variant="outline" className="border-dashed text-muted-foreground">
                Draft
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </CardTitle>
        </div>
        <CardDescription className="line-clamp-3">
          {article.excerpt}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{article.view_count}</span>
            </div>
            {helpfulRatio > 0 && (
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                <span>{helpfulRatio}% helpful</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
