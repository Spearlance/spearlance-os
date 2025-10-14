import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface TaskTemplate {
  id: string;
  channel_name: string;
  standard_stage_id: string;
  title: string;
  description: string | null;
  priority: string;
  created_at: string;
}

interface TemplateCardProps {
  template: TaskTemplate;
  onEdit: (template: TaskTemplate) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const priorityVariant = (priority: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };
  
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header: Channel + Priority */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            {template.channel_name}
          </Badge>
          <Badge variant={priorityVariant(template.priority)} className="shrink-0">
            {template.priority}
          </Badge>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-sm">{template.title}</h3>
        
        {/* Description preview */}
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(template)}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDelete(template.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}