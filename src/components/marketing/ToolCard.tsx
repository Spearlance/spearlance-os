import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Edit, Trash2, Plus, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: any;
  type: 'client' | 'recommended';
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddToClient?: () => void;
}

const categoryColors: Record<string, string> = {
  advertising: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  design: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  analytics: "bg-green-500/10 text-green-700 dark:text-green-400",
  "social-media": "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  "email-marketing": "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  seo: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  crm: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  "project-management": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  automation: "bg-red-500/10 text-red-700 dark:text-red-400",
  "content-creation": "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  other: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export function ToolCard({ tool, type, isAdmin, onEdit, onDelete, onAddToClient }: ToolCardProps) {
  const categoryColor = categoryColors[tool.category] || categoryColors.other;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {tool.logo_url && (
            <img 
              src={tool.logo_url} 
              alt={`${tool.name} logo`}
              className="h-10 w-10 rounded object-contain flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold truncate">{tool.name}</h3>
              <Badge variant="secondary" className={cn("text-xs shrink-0", categoryColor)}>
                {tool.category.replace('-', ' ')}
              </Badge>
            </div>
            
            {tool.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {tool.description}
              </p>
            )}

            {type === 'recommended' && tool.why_we_recommend && (
              <p className="text-sm text-muted-foreground italic line-clamp-2 mb-2">
                {tool.why_we_recommend}
              </p>
            )}

            {type === 'recommended' && tool.pricing_model && (
              <p className="text-sm font-medium text-foreground mb-2">
                {tool.pricing_model}
              </p>
            )}

            {type === 'client' && tool.cost_per_month && (
              <p className="text-sm font-medium text-foreground mb-2">
                ${tool.cost_per_month}/month
              </p>
            )}

            <div className="flex items-center justify-between gap-2 mt-3">
              {type === 'recommended' ? (
                <>
                  {/* Left: Sign Up Button */}
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="flex-shrink-0"
                  >
                    <a href={tool.url} target="_blank" rel="noopener noreferrer">
                      <Gift className="h-3 w-3 mr-1.5" />
                      Sign Up
                    </a>
                  </Button>

                  {/* Right: Edit (admin), Add, Delete (admin) */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin && onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onEdit}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onAddToClient && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onAddToClient}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-3 w-3 mr-1.5" />
                        Add
                      </Button>
                    )}
                    {isAdmin && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Client Tools Layout */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                    >
                      <a href={tool.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open Tool
                      </a>
                    </Button>

                    {tool.affiliate_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={tool.affiliate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Gift className="h-3 w-3 mr-2" />
                          Sign Up
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
