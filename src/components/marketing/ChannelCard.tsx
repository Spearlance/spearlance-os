import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, User } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"] & {
  taskCount?: number;
  assignedUserName?: string;
};

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
  clientName: string;
}

const statusColors = {
  active: "bg-green-100 text-green-700 border-green-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
  not_used: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusLabels = {
  active: "Active",
  in_progress: "In Progress",
  paused: "Paused",
  not_used: "Not Started",
};

export function ChannelCard({ channel, onClick, clientName }: ChannelCardProps) {
  const statusClass = statusColors[channel.status];
  const assignmentLabel = channel.assignedUserName || "Unassigned";

  return (
    <div
      className="relative min-w-[240px] h-[160px] rounded-lg p-4 cursor-pointer transition-shadow hover:shadow-md border bg-card"
      onClick={onClick}
    >
      {/* Channel name */}
      <h3 className="font-semibold mb-2 text-sm text-foreground">
        {channel.name}
      </h3>

      {/* Assignment badge */}
      <Badge variant="outline" className="mb-2 text-xs">
        <User className="h-3 w-3 mr-1" />
        {assignmentLabel}
      </Badge>

      {/* Status badge */}
      <Badge variant="outline" className={`mb-2 text-xs ${statusClass}`}>
        {statusLabels[channel.status]}
      </Badge>

      {/* Task count */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
        <CheckSquare className="h-3 w-3" />
        <span>{channel.taskCount || 0} Tasks</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={Number(channel.progress) || 0} className="h-2" />
        <span className="text-xs text-muted-foreground">{Math.round(Number(channel.progress) || 0)}%</span>
      </div>
    </div>
  );
}
