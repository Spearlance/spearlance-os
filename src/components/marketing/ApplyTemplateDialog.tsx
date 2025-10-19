import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Stage = Database["public"]["Tables"]["marketing_flow_stages"]["Row"];
type Template = Database["public"]["Tables"]["marketing_flow_task_templates"]["Row"];

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  selectedStageId?: string;
  clientId: string;
  onSuccess: () => void;
}

interface GroupedTemplates {
  [stageName: string]: {
    [channelName: string]: Template[];
  };
}

export function ApplyTemplateDialog({ open, onOpenChange, stages, selectedStageId, clientId, onSuccess }: ApplyTemplateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<GroupedTemplates>({});
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [includeTasks, setIncludeTasks] = useState(true);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("marketing_flow_task_templates")
      .select(`
        *,
        standard_stage:standard_marketing_stages(name, order_index)
      `);

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }

    // Group templates by stage and channel
    const grouped: GroupedTemplates = {};
    data?.forEach((template: any) => {
      const stageName = template.standard_stage?.name || 'Unknown';
      if (!grouped[stageName]) {
        grouped[stageName] = {};
      }
      if (!grouped[stageName][template.channel_name]) {
        grouped[stageName][template.channel_name] = [];
      }
      grouped[stageName][template.channel_name].push(template);
    });

    setTemplates(grouped);
  };

  const toggleChannel = (channelName: string) => {
    const newSet = new Set(selectedChannels);
    if (newSet.has(channelName)) {
      newSet.delete(channelName);
    } else {
      newSet.add(channelName);
    }
    setSelectedChannels(newSet);
  };

  const handleApply = async () => {
    if (selectedChannels.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one channel",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // For each selected channel
      for (const channelName of Array.from(selectedChannels)) {
        // Find stage for this channel by matching standard_stage_id
        let stageId: string | undefined;
        let channelTemplates: Template[] = [];

        for (const [stageName, channels] of Object.entries(templates)) {
          if (channels[channelName]) {
            // Get the standard_stage_id from the first template in this channel
            const firstTemplate: any = channels[channelName][0];
            // Find the client's stage that matches this standard stage
            const stage = stages.find((s: any) => s.standard_stage_id === firstTemplate.standard_stage_id);
            stageId = stage?.id;
            channelTemplates = channels[channelName];
            break;
          }
        }

        if (!stageId) continue;

        // Create channel
        const { data: channel, error: channelError } = await supabase
          .from("marketing_flow_channels")
          .insert({
            stage_id: stageId,
            name: channelName,
            assigned_to: user.id, // Assign to current user
            ownership: "client", // Default value for backward compatibility
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
        if (includeTasks && channelTemplates.length > 0) {
          for (const template of channelTemplates) {
            const { data: task, error: taskError } = await supabase
              .from("tasks")
              .insert({
                client_id: clientId,
                title: template.title,
                description: template.description,
                priority: template.priority,
                status: "to_do",
                linked_channel_id: channel.id,
                creator_user_id: user.id,
              })
              .select()
              .single();

            if (taskError) {
              console.error("Error creating task:", taskError);
              continue;
            }

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
        description: `Successfully created ${selectedChannels.size} channel(s)`,
      });

      setSelectedChannels(new Set());
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying template:", error);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply Template</DialogTitle>
          <DialogDescription>
            Select channels to create. Optionally include default tasks for each channel.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(templates).map(([stageName, channels]) => (
              <div key={stageName} className="space-y-3">
                <h3 className="font-semibold text-lg">{stageName}</h3>
                <div className="space-y-2 pl-4">
                  {Object.entries(channels).map(([channelName, channelTemplates]) => (
                    <div key={channelName} className="flex items-start space-x-3">
                      <Checkbox
                        id={channelName}
                        checked={selectedChannels.has(channelName)}
                        onCheckedChange={() => toggleChannel(channelName)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={channelName} className="font-medium cursor-pointer">
                          {channelName}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {channelTemplates.length} default task{channelTemplates.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center space-x-2 pt-4 border-t">
          <Checkbox
            id="include-tasks"
            checked={includeTasks}
            onCheckedChange={(checked) => setIncludeTasks(checked === true)}
          />
          <Label htmlFor="include-tasks" className="cursor-pointer">
            Include default tasks for selected channels
          </Label>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading || selectedChannels.size === 0}>
            {loading ? "Applying..." : `Apply Template (${selectedChannels.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
