import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus } from "lucide-react";
import { TemplateCard } from "./TemplateCard";
import { TemplateFormDialog } from "./TemplateFormDialog";
import { cn } from "@/lib/utils";

interface StandardStage {
  id: string;
  name: string;
  order_index: number;
  template_count?: number;
}

interface TaskTemplate {
  id: string;
  channel_name: string;
  standard_stage_id: string;
  title: string;
  description: string | null;
  priority: string;
  created_at: string;
}

interface TemplatesByChannel {
  [channelName: string]: TaskTemplate[];
}

export function TemplateStageManager() {
  const { toast } = useToast();
  const [stages, setStages] = useState<StandardStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<StandardStage | null>(null);
  const [templates, setTemplates] = useState<TemplatesByChannel>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  useEffect(() => {
    loadUserRole();
    loadStages();
  }, []);

  useEffect(() => {
    if (selectedStage) {
      loadTemplatesForStage(selectedStage.id);
    }
  }, [selectedStage]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data) setUserRole(data.role);
    }
  };

  const loadStages = async () => {
    const { data, error } = await supabase
      .from('standard_marketing_stages')
      .select('*')
      .order('order_index');

    if (error) {
      console.error("Error loading stages:", error);
      return;
    }

    // Get template counts for each stage
    const stagesWithCounts = await Promise.all(
      (data || []).map(async (stage) => {
        const { count } = await supabase
          .from('marketing_flow_task_templates')
          .select('*', { count: 'exact', head: true })
          .eq('standard_stage_id', stage.id);

        return { ...stage, template_count: count || 0 };
      })
    );

    setStages(stagesWithCounts);
    if (stagesWithCounts.length > 0 && !selectedStage) {
      setSelectedStage(stagesWithCounts[0]);
    }
  };

  const loadTemplatesForStage = async (stageId: string) => {
    const { data, error } = await supabase
      .from('marketing_flow_task_templates')
      .select('*')
      .eq('standard_stage_id', stageId)
      .order('channel_name')
      .order('created_at');

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }

    // Group by channel
    const grouped: TemplatesByChannel = {};
    data?.forEach(template => {
      if (!grouped[template.channel_name]) {
        grouped[template.channel_name] = [];
      }
      grouped[template.channel_name].push(template);
    });

    setTemplates(grouped);
  };

  const handleEdit = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase
      .from("marketing_flow_task_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({ title: "Error deleting template", variant: "destructive" });
    } else {
      toast({ title: "Template deleted successfully" });
      loadStages();
      if (selectedStage) {
        loadTemplatesForStage(selectedStage.id);
      }
    }
  };

  const handleSuccess = () => {
    loadStages();
    if (selectedStage) {
      loadTemplatesForStage(selectedStage.id);
    }
  };

  const filteredStages = stages.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Left Rail */}
      <div className="w-80 border-r bg-muted/10 p-4">
        <h2 className="text-lg font-semibold mb-4">Marketing Stages</h2>

        <Input
          placeholder="Search stages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        <div className="space-y-2">
          {filteredStages.map(stage => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors",
                "flex items-center justify-between",
                selectedStage?.id === stage.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span className="font-medium">{stage.name}</span>
              <Badge variant="secondary" className={cn(
                selectedStage?.id === stage.id && "bg-primary-foreground/20 text-primary-foreground"
              )}>
                {stage.template_count || 0}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Right Workspace */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedStage ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">{selectedStage.name} Templates</h1>
              {(userRole === 'admin' || userRole === 'fmm') && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>

            {Object.keys(templates).length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/5">
                <p className="text-muted-foreground">No templates for this stage yet</p>
                {(userRole === 'admin' || userRole === 'fmm') && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Template
                  </Button>
                )}
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(templates).map(([channelName, channelTemplates]) => (
                  <AccordionItem key={channelName} value={channelName}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="font-semibold">{channelName}</span>
                        <Badge variant="secondary">{channelTemplates.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-3">
                      {channelTemplates.map(template => (
                        <TemplateCard
                          key={template.id}
                          template={template as any}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Select a stage to view templates</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TemplateFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleSuccess}
        selectedStageId={selectedStage?.id}
      />
      <TemplateFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        template={selectedTemplate as any}
        onSuccess={handleSuccess}
        selectedStageId={selectedStage?.id}
      />
    </div>
  );
}
