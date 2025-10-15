import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit, Trash2, ExternalLink, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Competitor {
  id: string;
  client_id: string;
  name: string;
  website_url?: string;
  description?: string;
  strengths?: string;
  weaknesses?: string;
  why_we_are_better?: string;
  pricing_strategy?: string;
  target_market?: string;
  notes?: string;
}

interface CompetitorCardProps {
  competitor: Competitor;
  onEdit: () => void;
  onDelete: () => void;
}

export function CompetitorCard({ competitor, onEdit, onDelete }: CompetitorCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              {competitor.name}
              {competitor.website_url && (
                <a
                  href={competitor.website_url.startsWith('http') ? competitor.website_url : `https://${competitor.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm font-normal"
                  onClick={(e) => e.stopPropagation()}
                >
                  Visit Site
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardTitle>
            {competitor.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {competitor.description}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {(competitor.strengths || competitor.weaknesses || competitor.why_we_are_better || 
          competitor.pricing_strategy || competitor.target_market || competitor.notes) && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                {isOpen ? "Hide Details" : "Show Details"}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-3 mt-3">
              {competitor.strengths && (
                <div>
                  <Badge variant="secondary" className="mb-2">Strengths</Badge>
                  <p className="text-sm whitespace-pre-wrap">{competitor.strengths}</p>
                </div>
              )}

              {competitor.weaknesses && (
                <div>
                  <Badge variant="secondary" className="mb-2">Weaknesses</Badge>
                  <p className="text-sm whitespace-pre-wrap">{competitor.weaknesses}</p>
                </div>
              )}

              {competitor.why_we_are_better && (
                <div>
                  <Badge variant="default" className="mb-2">Why We're Better</Badge>
                  <p className="text-sm whitespace-pre-wrap">{competitor.why_we_are_better}</p>
                </div>
              )}

              {competitor.pricing_strategy && (
                <div>
                  <Badge variant="outline" className="mb-2">Pricing Strategy</Badge>
                  <p className="text-sm whitespace-pre-wrap">{competitor.pricing_strategy}</p>
                </div>
              )}

              {competitor.target_market && (
                <div>
                  <Badge variant="outline" className="mb-2">Target Market</Badge>
                  <p className="text-sm whitespace-pre-wrap">{competitor.target_market}</p>
                </div>
              )}

              {competitor.notes && (
                <div>
                  <Badge variant="outline" className="mb-2">Notes</Badge>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{competitor.notes}</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
