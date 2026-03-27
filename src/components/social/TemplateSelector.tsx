import { getAllTemplates } from "@/lib/social-templates/registry";
import type { SocialTemplate } from "@/lib/social-templates/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TemplateSelectorProps {
  category: string;
  onSelect: (template: SocialTemplate) => void;
}

export const TemplateSelector = ({ category, onSelect }: TemplateSelectorProps) => {
  const all = getAllTemplates();
  const recommended = all.filter((t) => t.category === category);
  const rest = all.filter((t) => t.category !== category);
  const ordered = [...recommended, ...rest];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Choose a Template</h3>
        <p className="text-muted-foreground">Pick the layout that fits your post best</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ordered.map((template) => {
          const isRecommended = recommended.some((r) => r.id === template.id);
          return (
            <Card
              key={template.id}
              className={`cursor-pointer hover:shadow-lg transition-all ${
                isRecommended ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onSelect(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {isRecommended && (
                    <Badge variant="default" className="text-xs shrink-0">
                      Recommended
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
