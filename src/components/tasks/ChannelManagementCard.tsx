import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, CheckSquare, Edit, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"] & {
  taskCount?: number;
  assignedUserName?: string;
};

interface ChannelManagementCardProps {
  channel: Channel;
  onEdit: (channel: Channel) => void;
  onDelete: (channelId: string, channelName: string, taskCount: number) => void;
  canEdit: boolean;
}

const statusColors = {
  active: "bg-success/10 text-success border-success/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  not_used: "bg-muted text-muted-foreground border-border",
};

const statusLabels = {
  active: "Active",
  in_progress: "In Progress",
  paused: "Paused",
  not_used: "Not Started",
};

export function ChannelManagementCard({ channel, onEdit, onDelete, canEdit }: ChannelManagementCardProps) {
  const statusClass = statusColors[channel.status];
  const assignmentLabel = channel.assignedUserName || "Unassigned";

  return (
    <Card className="border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: "hsl(var(--primary))" }}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{channel.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                {assignmentLabel}
              </Badge>
              <Badge variant="outline" className={`text-xs ${statusClass}`}>
                {statusLabels[channel.status]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                {channel.taskCount || 0} Task{channel.taskCount === 1 ? '' : 's'}
              </Badge>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(channel)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(channel.id, channel.name, channel.taskCount || 0)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(Number(channel.progress) || 0)}%</span>
          </div>
          <Progress value={Number(channel.progress) || 0} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
