import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Clock, User, AlertTriangle, Zap } from "lucide-react";

interface TaskTemplate {
  id: string;
  channel_name: string;
  standard_stage_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  task_type: string;
  cadence: string | null;
  owner_role: string | null;
  client_dependency: boolean;
  client_dependency_notes: string | null;
  sla_target: string | null;
  impact: string | null;
  links_required: string | null;
  created_at: string;
}

interface TemplateCardProps {
  template: TaskTemplate;
  onEdit: (template: TaskTemplate) => void;
  onDelete: (templateId: string) => void;
}

const OWNER_ROLE_LABELS: Record<string, string> = {
  csm: 'CSM',
  seo_specialist: 'SEO',
  ads_specialist: 'Ads',
  web_pm: 'Web PM',
  content_writer: 'Content',
  designer: 'Design',
  dev: 'Dev',
};

const SLA_LABELS: Record<string, string> = {
  '24h': '24h',
  '48h': '48h',
  '5d': '5d',
  'next_meeting': 'Next Mtg',
};

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

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
        {/* Header: Metadata badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Owner Role */}
          {template.owner_role && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              {OWNER_ROLE_LABELS[template.owner_role] || template.owner_role}
            </Badge>
          )}
          
          {/* SLA Target */}
          {template.sla_target && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {SLA_LABELS[template.sla_target] || template.sla_target}
            </Badge>
          )}
          
          {/* Impact */}
          {template.impact && (
            <Badge className={`text-xs ${IMPACT_COLORS[template.impact] || ''}`}>
              <Zap className="h-3 w-3 mr-1" />
              {template.impact}
            </Badge>
          )}
          
          {/* Client Dependency */}
          {template.client_dependency && (
            <Badge variant="outline" className="text-xs flex items-center gap-1 text-orange-600 border-orange-300">
              <AlertTriangle className="h-3 w-3" />
              Client Input
            </Badge>
          )}
          
          {/* Priority (pushed right) */}
          <div className="flex-1" />
          <Badge variant={priorityVariant(template.priority)} className="text-xs">
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

        {/* Client dependency notes */}
        {template.client_dependency && template.client_dependency_notes && (
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Needs: {template.client_dependency_notes}
          </p>
        )}

        {/* Links required */}
        {template.links_required && (
          <p className="text-xs text-muted-foreground">
            Links: {template.links_required}
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