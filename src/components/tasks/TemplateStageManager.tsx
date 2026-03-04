import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Search, MapPin, Target, Globe, FileText } from "lucide-react";
import { TemplateCard } from "./TemplateCard";
import { TemplateFormDialog } from "./TemplateFormDialog";
import { cn } from "@/lib/utils";

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

interface ChannelInfo {
  name: string;
  icon: React.ReactNode;
  count: number;
}

interface TemplatesByTaskType {
  onboarding: TaskTemplate[];
  recurring: TaskTemplate[];
  one_off: TaskTemplate[];
}

const CHANNELS: { name: string; icon: React.ReactNode }[] = [
  { name: 'Local SEO', icon: <MapPin className="h-4 w-4" /> },
  { name: 'Google Ads', icon: <Target className="h-4 w-4" /> },
  { name: 'Facebook Ads', icon: <Target className="h-4 w-4" /> },
  { name: 'Website', icon: <Globe className="h-4 w-4" /> },
  { name: 'Blog', icon: <FileText className="h-4 w-4" /> },
];

const TASK_TYPE_LABELS: Record<string, string> = {
  onboarding: 'Onboarding Tasks',
  recurring: 'Recurring Tasks',
  one_off: 'One-off Tasks',
};

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

export function TemplateStageManager() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplatesByTaskType>({
    onboarding: [],
    recurring: [],
    one_off: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  useEffect(() => {
    loadUserRole();
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      loadTemplatesForChannel(selectedChannel);
    }
  }, [selectedChannel]);

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

  const loadChannels = async () => {
    // Get template counts per channel
    const { data, error } = await supabase
      .from('marketing_flow_task_templates')
      .select('channel_name');

    if (error) {
      console.error("Error loading channels:", error);
      return;
    }

    // Count templates per channel
    const counts: Record<string, number> = {};
    data?.forEach(t => {
      counts[t.channel_name] = (counts[t.channel_name] || 0) + 1;
    });

    const channelsWithCounts = CHANNELS.map(ch => ({
      ...ch,
      count: counts[ch.name] || 0,
    }));

    setChannels(channelsWithCounts);
    if (channelsWithCounts.length > 0 && !selectedChannel) {
      setSelectedChannel(channelsWithCounts[0].name);
    }
  };

  const loadTemplatesForChannel = async (channelName: string) => {
    const { data, error } = await supabase
      .from('marketing_flow_task_templates')
      .select('*')
      .eq('channel_name', channelName)
      .order('task_type')
      .order('cadence')
      .order('created_at');

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }

    // Group by task type
    const grouped: TemplatesByTaskType = {
      onboarding: [],
      recurring: [],
      one_off: [],
    };

    data?.forEach(template => {
      const taskType = template.task_type as keyof TemplatesByTaskType;
      if (grouped[taskType]) {
        grouped[taskType].push(template as TaskTemplate);
      }
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
      toast.error("Error deleting template");
    } else {
      toast.success("Template deleted successfully");
      loadChannels();
      if (selectedChannel) {
        loadTemplatesForChannel(selectedChannel);
      }
    }
  };

  const handleSuccess = () => {
    loadChannels();
    if (selectedChannel) {
      loadTemplatesForChannel(selectedChannel);
    }
  };

  const filteredChannels = channels.filter(ch => 
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group recurring tasks by cadence
  const groupRecurringByCadence = (templates: TaskTemplate[]) => {
    const grouped: Record<string, TaskTemplate[]> = {};
    templates.forEach(t => {
      const cadence = t.cadence || 'unspecified';
      if (!grouped[cadence]) {
        grouped[cadence] = [];
      }
      grouped[cadence].push(t);
    });
    return grouped;
  };

  const totalTemplates = templates.onboarding.length + templates.recurring.length + templates.one_off.length;

  return (
    <div className="flex h-full">
      {/* Left Rail */}
      <div className="w-80 border-r bg-muted/10 p-4">
        <h2 className="text-lg font-semibold mb-4">Channel Playbooks</h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {filteredChannels.map(channel => (
            <button
              key={channel.name}
              onClick={() => setSelectedChannel(channel.name)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors",
                "flex items-center justify-between",
                selectedChannel === channel.name
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                {channel.icon}
                <span className="font-medium">{channel.name}</span>
              </div>
              <Badge variant="secondary" className={cn(
                selectedChannel === channel.name && "bg-primary-foreground/20 text-primary-foreground"
              )}>
                {channel.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Right Workspace */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedChannel ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{selectedChannel} Playbook</h1>
                <p className="text-muted-foreground">
                  {totalTemplates} template{totalTemplates !== 1 ? 's' : ''}
                </p>
              </div>
              {(userRole === 'admin' || userRole === 'fmm') && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>

            {totalTemplates === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/5">
                <p className="text-muted-foreground">No templates for this channel yet</p>
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
              <Accordion type="multiple" defaultValue={['onboarding', 'recurring', 'one_off']} className="space-y-4">
                {/* Onboarding Tasks */}
                {templates.onboarding.length > 0 && (
                  <AccordionItem value="onboarding" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{TASK_TYPE_LABELS.onboarding}</span>
                        <Badge variant="secondary">{templates.onboarding.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2 pb-4">
                      {templates.onboarding.map(template => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Recurring Tasks - grouped by cadence */}
                {templates.recurring.length > 0 && (
                  <AccordionItem value="recurring" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{TASK_TYPE_LABELS.recurring}</span>
                        <Badge variant="secondary">{templates.recurring.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      {Object.entries(groupRecurringByCadence(templates.recurring)).map(([cadence, tasks]) => (
                        <div key={cadence} className="mb-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Badge variant="outline" className="font-normal">
                              {CADENCE_LABELS[cadence] || cadence}
                            </Badge>
                            <span className="text-xs">({tasks.length})</span>
                          </h4>
                          <div className="space-y-3">
                            {tasks.map(template => (
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
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* One-off Tasks */}
                {templates.one_off.length > 0 && (
                  <AccordionItem value="one_off" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{TASK_TYPE_LABELS.one_off}</span>
                        <Badge variant="secondary">{templates.one_off.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2 pb-4">
                      {templates.one_off.map(template => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Select a channel to view its playbook</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TemplateFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleSuccess}
        selectedChannel={selectedChannel || undefined}
      />
      <TemplateFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        template={selectedTemplate}
        onSuccess={handleSuccess}
        selectedChannel={selectedChannel || undefined}
      />
    </div>
  );
}