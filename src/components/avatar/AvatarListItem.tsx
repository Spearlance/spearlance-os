import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AvatarListItemProps {
  avatar: any;
  isSelected: boolean;
  onClick: () => void;
}

export function AvatarListItem({ avatar, isSelected, onClick }: AvatarListItemProps) {
  const getStatus = () => {
    const hasSummary = !!avatar.ai_summary;
    const hasImages = avatar.generated_image_urls?.length > 0;
    
    if (hasSummary && hasImages) return { label: "Complete", variant: "default" as const };
    if (hasSummary) return { label: "Summary only", variant: "secondary" as const };
    if (hasImages) return { label: "Images only", variant: "secondary" as const };
    return { label: "Draft", variant: "outline" as const };
  };

  const status = getStatus();

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50",
        isSelected ? "border-primary bg-accent" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{avatar.avatar_name}</h3>
        </div>
        <Badge variant={status.variant} className="shrink-0 text-xs">
          {status.label}
        </Badge>
      </div>
    </div>
  );
}
