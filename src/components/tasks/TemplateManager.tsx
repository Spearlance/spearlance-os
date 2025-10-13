import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus } from "lucide-react";
import { TemplateCard } from "./TemplateCard";
import { TemplateFormDialog } from "./TemplateFormDialog";
import { useToast } from "@/hooks/use-toast";

interface TaskTemplate {
  id: string;
  channel_name: string;
  stage_name: string;
  title: string;
  description: string | null;
  priority: string;
  created_at: string;
}

export function TemplateManager() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [groupBy, setGroupBy] = useState<'stage' | 'channel'>('stage');
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('marketing_flow_task_templates')
      .select('*')
      .order('stage_name', { ascending: true })
      .order('channel_name', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      toast({ title: "Error loading templates", variant: "destructive" });
      return;
    }

    if (data) setTemplates(data);
  };

  const groupedTemplates = useMemo(() => {
    if (groupBy === 'stage') {
      return templates.reduce((acc, template) => {
        if (!acc[template.stage_name]) {
          acc[template.stage_name] = {};
        }
        if (!acc[template.stage_name][template.channel_name]) {
          acc[template.stage_name][template.channel_name] = [];
        }
        acc[template.stage_name][template.channel_name].push(template);
        return acc;
      }, {} as Record<string, Record<string, TaskTemplate[]>>);
    } else {
      return templates.reduce((acc, template) => {
        if (!acc[template.channel_name]) {
          acc[template.channel_name] = {};
        }
        if (!acc[template.channel_name][template.stage_name]) {
          acc[template.channel_name][template.stage_name] = [];
        }
        acc[template.channel_name][template.stage_name].push(template);
        return acc;
      }, {} as Record<string, Record<string, TaskTemplate[]>>);
    }
  }, [templates, groupBy]);

  const handleEdit = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this template?');
    if (!confirmed) return;
    
    const { error } = await supabase
      .from('marketing_flow_task_templates')
      .delete()
      .eq('id', templateId);
    
    if (error) {
      toast({ title: "Error deleting template", variant: "destructive" });
    } else {
      toast({ title: "Template deleted successfully" });
      loadTemplates();
    }
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Task Templates</h2>
            <p className="text-sm text-muted-foreground">
              Manage templates for Marketing Flowchart channels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={groupBy} onValueChange={(value: 'stage' | 'channel') => setGroupBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stage">Group by Stage</SelectItem>
                <SelectItem value="channel">Group by Channel</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-4">No templates created yet</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Template
          </Button>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(groupedTemplates).map(([primaryKey, secondaryGroups]) => (
            <AccordionItem key={primaryKey} value={primaryKey} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="font-semibold">{primaryKey}</span>
                  <span className="text-sm text-muted-foreground">
                    {Object.values(secondaryGroups).flat().length} template(s)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {Object.entries(secondaryGroups).map(([secondaryKey, templateList]) => (
                    <div key={secondaryKey} className="space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground">
                        {secondaryKey} ({templateList.length})
                      </h3>
                      <div className="grid gap-3">
                        {templateList.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <TemplateFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          loadTemplates();
          handleDialogClose();
        }}
      />

      <TemplateFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        template={selectedTemplate}
        onSuccess={() => {
          loadTemplates();
          handleDialogClose();
        }}
      />
    </div>
  );
}