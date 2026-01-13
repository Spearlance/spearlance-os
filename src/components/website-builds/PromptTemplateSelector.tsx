import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface Template {
  id: string;
  page_type: string;
  template_name: string;
  prompt_template: string;
  is_default: boolean;
}

interface PromptTemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

const pageTypeIcons: Record<string, string> = {
  home: "🏠",
  services: "⚙️",
  about: "👋",
  contact: "📞",
  gallery: "🖼️",
  landing: "🎯",
};

export default function PromptTemplateSelector({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: PromptTemplateSelectorProps) {
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Content Template
      </Label>
      
      <Select value={selectedTemplateId} onValueChange={onSelectTemplate}>
        <SelectTrigger>
          <SelectValue placeholder="Select a template..." />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                <span>{pageTypeIcons[template.page_type] || "📄"}</span>
                <span>{template.template_name}</span>
                {template.is_default && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    Default
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTemplate && (
        <p className="text-xs text-muted-foreground">
          This template is optimized for {selectedTemplate.template_name.toLowerCase()} content with structured sections.
        </p>
      )}
    </div>
  );
}
