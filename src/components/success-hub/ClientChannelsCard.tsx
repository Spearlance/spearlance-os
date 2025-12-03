import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Megaphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ClientChannel {
  id: string;
  name: string;
  status: string;
  progress: number;
  stage_name: string;
  assigned_user?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

interface ClientChannelsCardProps {
  channels: ClientChannel[];
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ClientChannelsCard({ channels }: ClientChannelsCardProps) {
  const navigate = useNavigate();

  // Group channels by stage
  const channelsByStage = channels.reduce((acc, channel) => {
    const stage = channel.stage_name;
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(channel);
    return acc;
  }, {} as Record<string, ClientChannel[]>);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="text-xs">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary" className="text-xs">Paused</Badge>;
      case 'planned':
        return <Badge variant="outline" className="text-xs">Planned</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Active Channels
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/flow')}>
            View Flowchart
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No marketing channels configured</p>
            <Button variant="link" size="sm" onClick={() => navigate('/marketing/flow')}>
              Set up marketing flowchart
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(channelsByStage).map(([stage, stageChannels]) => (
              <div key={stage}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {stage}
                </h4>
                <div className="space-y-2">
                  {stageChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        {channel.assigned_user && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={channel.assigned_user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(channel.assigned_user.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-sm font-medium">{channel.name}</span>
                        {getStatusBadge(channel.status)}
                      </div>
                      <div className="flex items-center gap-2 w-24">
                        <Progress value={channel.progress} className="h-1.5" />
                        <span className="text-xs text-muted-foreground w-8">
                          {channel.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
