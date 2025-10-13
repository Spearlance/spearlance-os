import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckSquare } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"] & {
  taskCount?: number;
};

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
}

const ownershipStyles = {
  spearlance: {
    border: "#13CF48",
    bg: "#EAFBF0",
    text: "#0E7E2A",
    label: "Spearlance Handles",
  },
  client: {
    border: "#D1D5DB",
    bg: "#F9FAFB",
    text: "#374151",
    label: "Client Handles",
  },
  both: {
    border: "#D1D5DB",
    bg: "#F9FAFB",
    text: "#374151",
    label: "Both",
    accentBar: true,
  },
};

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
  not_used: "Not Used",
};

export function ChannelCard({ channel, onClick }: ChannelCardProps) {
  const styles = ownershipStyles[channel.ownership];
  const statusClass = statusColors[channel.status];
  const showAccentBar = channel.ownership === "both";

  return (
    <div
      className="relative min-w-[240px] h-[160px] rounded-lg p-4 cursor-pointer transition-shadow hover:shadow-md"
      style={{
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: styles.border,
        backgroundColor: styles.bg,
      }}
      onClick={onClick}
    >
      {/* Accent bar for "both" ownership */}
      {showAccentBar && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: "#13CF48" }}
        />
      )}

      {/* Channel name */}
      <h3 className="font-semibold mb-2 text-sm" style={{ color: styles.text }}>
        {channel.name}
      </h3>

      {/* Ownership badge */}
      <Badge
        variant="outline"
        className="mb-2 text-xs"
        style={{ borderColor: styles.border, color: styles.text }}
      >
        {styles.label}
      </Badge>

      {/* Status badge */}
      <Badge variant="outline" className={`mb-2 text-xs ${statusClass}`}>
        {statusLabels[channel.status]}
      </Badge>

      {/* Task count */}
      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
        <CheckSquare className="h-3 w-3" />
        <span>{channel.taskCount || 0} Tasks</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={Number(channel.progress) || 0} className="h-2" />
        <span className="text-xs text-gray-600">{Math.round(Number(channel.progress) || 0)}%</span>
      </div>
    </div>
  );
}
