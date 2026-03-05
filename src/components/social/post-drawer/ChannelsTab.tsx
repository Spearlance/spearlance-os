import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Video,
  Loader2,
} from "lucide-react";

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, limit: 2200 },
  { id: "facebook", label: "Facebook", icon: Facebook, limit: 63206 },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, limit: 3000 },
  { id: "twitter", label: "Twitter / X", icon: Twitter, limit: 280 },
  { id: "tiktok", label: "TikTok", icon: Video, limit: 2200 },
];

interface ChannelsTabProps {
  selectedPlatforms: string[];
  connectedPlatforms: Set<string>;
  isSaving: boolean;
  onPlatformToggle: (platformId: string, checked: boolean) => void;
  onSave: () => void;
}

const getConnectionStatus = (
  platformId: string,
  connectedPlatforms: Set<string>
): {
  label: string;
  variant: "default" | "secondary" | "outline";
  isConnected: boolean;
  requiresManualScheduling: boolean;
} => {
  const comingSoonPlatforms = ["linkedin", "twitter", "tiktok"];

  if (comingSoonPlatforms.includes(platformId)) {
    return {
      label: "Manual Scheduling",
      variant: "secondary",
      isConnected: false,
      requiresManualScheduling: true,
    };
  }

  const isConnected = connectedPlatforms.has(platformId);

  return {
    label: isConnected ? "Connected" : "Manual Scheduling",
    variant: isConnected ? "default" : "outline",
    isConnected,
    requiresManualScheduling: !isConnected,
  };
};

export const ChannelsTab = ({
  selectedPlatforms,
  connectedPlatforms,
  isSaving,
  onPlatformToggle,
  onSave,
}: ChannelsTabProps) => {
  return (
    <div className="p-6 space-y-4">
      <div>
        <Label className="text-base">Select Social Platforms</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Choose where this post will be published
        </p>
      </div>

      <div className="space-y-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const PlatformIcon = platform.icon;
          const connectionStatus = getConnectionStatus(platform.id, connectedPlatforms);

          return (
            <Card key={platform.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={(checked) =>
                      onPlatformToggle(platform.id, checked as boolean)
                    }
                  />
                  <PlatformIcon className="h-5 w-5" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Label className="cursor-pointer">{platform.label}</Label>
                      <Badge
                        variant={connectionStatus.variant}
                        className={
                          connectionStatus.isConnected
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-300"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300"
                        }
                      >
                        {connectionStatus.label}
                      </Badge>
                    </div>
                    {connectionStatus.requiresManualScheduling && (
                      <p className="text-xs text-muted-foreground">
                        You'll need to schedule this manually on {platform.label}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {platform.limit} chars max
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedPlatforms.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Select at least one platform to publish this post
        </p>
      )}

      <Button onClick={onSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Platform Selection"
        )}
      </Button>
    </div>
  );
};
