import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    color: string;
  };
  articleCount: number;
  onClick: () => void;
}

export function CategoryCard({ category, articleCount, onClick }: CategoryCardProps) {
  const Icon = category.icon;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 group"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br",
            category.color,
            "group-hover:scale-110 transition-transform"
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <Badge variant="secondary">{articleCount} articles</Badge>
        </div>
        <CardTitle className="group-hover:text-primary transition-colors">
          {category.name}
        </CardTitle>
        <CardDescription>{category.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
