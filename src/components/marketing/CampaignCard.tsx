import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pause, Play, CheckCircle, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
  onStatusChange?: (newStatus: string) => void;
  onDelete?: () => void;
  isAdminOrFMM: boolean;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    icon: <Play className="h-3 w-3" />,
  },
  paused: {
    label: "Paused",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: <Pause className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

export function CampaignCard({ campaign, onClick, onStatusChange, onDelete, isAdminOrFMM }: CampaignCardProps) {
  const config = statusConfig[campaign.status] || statusConfig.active;

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{campaign.name}</span>
          <Badge variant="outline" className={config.className}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
        </div>
        {campaign.description && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            {campaign.description}
          </p>
        )}
      </div>

      {isAdminOrFMM && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {campaign.status !== "active" && (
              <DropdownMenuItem onClick={() => onStatusChange?.("active")}>
                <Play className="h-4 w-4 mr-2" />
                Set Active
              </DropdownMenuItem>
            )}
            {campaign.status !== "paused" && (
              <DropdownMenuItem onClick={() => onStatusChange?.("paused")}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </DropdownMenuItem>
            )}
            {campaign.status !== "completed" && (
              <DropdownMenuItem onClick={() => onStatusChange?.("completed")}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Completed
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete?.()} 
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
