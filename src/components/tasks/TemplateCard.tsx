import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface TaskTemplate {
  id: string;
  channel_name: string;
  stage_name: string;
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
  const stageColors: Record<string, string> = {
    'Attract': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    'Engage': 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    'Convert': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
    'Close': 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    'Retain and Reactivate': 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800',
  };
  
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
        {/* Header: Channel + Stage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={stageColors[template.stage_name]}>
              {template.channel_name}
            </Badge>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{template.stage_name}</span>
          </div>
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