import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Target, Globe, FileText, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Stage = Database["public"]["Tables"]["marketing_flow_stages"]["Row"];

interface PlaybookInfo {
  name: string;
  icon: React.ReactNode;
  onboarding: number;
  recurring: number;
  one_off: number;
  total: number;
}

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  selectedStageId?: string;
  clientId: string;
  onSuccess: () => void;
}

const PLAYBOOK_ICONS: Record<string, React.ReactNode> = {
  'Local SEO': <MapPin className="h-5 w-5" />,
  'Google Ads': <Target className="h-5 w-5" />,
  'Facebook Ads': <Target className="h-5 w-5" />,
  'Website': <Globe className="h-5 w-5" />,
  'Blog': <FileText className="h-5 w-5" />,
};

const CADENCE_TO_RECURRENCE: Record<string, { frequency: string; interval: number }> = {
  daily: { frequency: 'daily', interval: 1 },
  weekly: { frequency: 'weekly', interval: 1 },
  biweekly: { frequency: 'weekly', interval: 2 },
  monthly: { frequency: 'monthly', interval: 1 },
  quarterly: { frequency: 'monthly', interval: 3 },
};

export function ApplyTemplateDialog({ open, onOpenChange, stages, selectedStageId, clientId, onSuccess }: ApplyTemplateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playbooks, setPlaybooks] = useState<PlaybookInfo[]>([]);
  const [selectedPlaybooks, setSelectedPlaybooks] = useState<Set<string>>(new Set());
  const [includeTasks, setIncludeTasks] = useState(true);

  useEffect(() => {
    if (open) {
      loadPlaybooks();
    }
  }, [open]);

  const loadPlaybooks = async () => {
    const { data, error } = await supabase
      .from("marketing_flow_task_templates")
      .select("channel_name, task_type");

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }

    // Aggregate by playbook
    const playbookMap: Record<string, PlaybookInfo> = {};
    
    data?.forEach((template) => {
      const name = template.channel_name;
      if (!playbookMap[name]) {
        playbookMap[name] = {
          name,
          icon: PLAYBOOK_ICONS[name] || <Target className="h-5 w-5" />,
          onboarding: 0,
          recurring: 0,
          one_off: 0,
          total: 0,
        };
      }
      
      if (template.task_type === 'onboarding') {
        playbookMap[name].onboarding++;
      } else if (template.task_type === 'recurring') {
        playbookMap[name].recurring++;
      } else {
        playbookMap[name].one_off++;
      }
      playbookMap[name].total++;
    });

    // Convert to array and sort
    const playbookList = Object.values(playbookMap).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    setPlaybooks(playbookList);
  };

  const togglePlaybook = (name: string) => {
    const newSet = new Set(selectedPlaybooks);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedPlaybooks(newSet);
  };

  const handleApply = async () => {
    if (selectedPlaybooks.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one playbook",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use a default stage (first one) since we're not using stages for playbooks
      const defaultStage = stages[0];
      if (!defaultStage) {
        toast({
          title: "Error",
          description: "No marketing stages available",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let totalTasksCreated = 0;

      // For each selected playbook
      for (const playbookName of Array.from(selectedPlaybooks)) {
        // Fetch all templates for this playbook
        const { data: templates } = await supabase
          .from("marketing_flow_task_templates")
          .select("*")
          .eq("channel_name", playbookName);

        if (!templates || templates.length === 0) continue;

        // Create channel
        const { data: channel, error: channelError } = await supabase
          .from("marketing_flow_channels")
          .insert({
            stage_id: defaultStage.id,
            name: playbookName,
            assigned_to: user.id,
            ownership: "client",
            status: "not_used",
            created_by: user.id,
          })
          .select()
          .single();

        if (channelError) {
          console.error("Error creating channel:", channelError);
          continue;
        }

        // Create tasks if requested
        if (includeTasks && templates.length > 0) {
          for (const template of templates) {
            // Determine if task should be recurring
            const isRecurring = template.task_type === 'recurring' && template.cadence;
            const recurrencePattern = isRecurring && template.cadence 
              ? CADENCE_TO_RECURRENCE[template.cadence] 
              : null;

            const { data: task, error: taskError } = await supabase
              .from("tasks")
              .insert([{
                client_id: clientId,
                title: template.title,
                description: template.description,
                priority: template.priority,
                status: "to_do",
                linked_channel_id: channel.id,
                creator_user_id: user.id,
                is_recurring: isRecurring || false,
                recurrence_pattern: recurrencePattern,
              }])
              .select()
              .single();

            if (taskError) {
              console.error("Error creating task:", taskError);
              continue;
            }

            totalTasksCreated++;

            // Link task to channel
            await supabase
              .from("marketing_flow_task_links")
              .insert({
                channel_id: channel.id,
                task_id: task.id,
                created_by: user.id,
              });
          }
        }
      }

      toast({
        title: "Success",
        description: `Created ${selectedPlaybooks.size} channel(s)${includeTasks ? ` with ${totalTasksCreated} tasks` : ''}`,
      });

      setSelectedPlaybooks(new Set());
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying template:", error);
      toast({
        title: "Error",
        description: "Failed to apply playbook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Apply Playbook</DialogTitle>
          <DialogDescription>
            Select channel playbooks to apply. Each playbook creates a channel with pre-configured tasks.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3">
            {playbooks.map((playbook) => (
              <div 
                key={playbook.name} 
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedPlaybooks.has(playbook.name) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => togglePlaybook(playbook.name)}
              >
                <Checkbox
                  id={playbook.name}
                  checked={selectedPlaybooks.has(playbook.name)}
                  onCheckedChange={() => togglePlaybook(playbook.name)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{playbook.icon}</span>
                    <Label htmlFor={playbook.name} className="font-semibold cursor-pointer">
                      {playbook.name}
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {playbook.onboarding} onboarding
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {playbook.recurring} recurring
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {playbook.one_off} one-off
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {playbook.total} total
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {playbooks.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No playbooks available. Create templates first.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center space-x-2 pt-4 border-t">
          <Checkbox
            id="include-tasks"
            checked={includeTasks}
            onCheckedChange={(checked) => setIncludeTasks(checked === true)}
          />
          <Label htmlFor="include-tasks" className="cursor-pointer">
            Include all tasks from selected playbooks
          </Label>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading || selectedPlaybooks.size === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              `Apply ${selectedPlaybooks.size} Playbook${selectedPlaybooks.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}