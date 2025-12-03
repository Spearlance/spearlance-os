import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, Clock, Users } from "lucide-react";
import { HealthStatusSelector } from "./HealthStatusSelector";
import { formatDistanceToNow, format } from "date-fns";
import { ClientWithOwners } from "@/hooks/useSuccessHub";

interface ClientSnapshotBarProps {
  clientData: ClientWithOwners | null;
  healthStatus: 'green' | 'yellow' | 'red';
  onHealthStatusChange: (status: 'green' | 'yellow' | 'red') => void;
  lastCommunication: any;
  nextMeeting: any;
}

const segmentLabels: Record<string, string> = {
  seo: 'SEO',
  ads: 'Ads',
  web: 'Web',
  full: 'Full Service',
};

const cadenceLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function ClientSnapshotBar({
  clientData,
  healthStatus,
  onHealthStatusChange,
  lastCommunication,
  nextMeeting,
}: ClientSnapshotBarProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Client Name & Segment */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {clientData?.name || 'Select a Client'}
            </h1>
            {clientData?.segment && (
              <Badge variant="secondary" className="mt-1">
                {segmentLabels[clientData.segment] || clientData.segment}
              </Badge>
            )}
          </div>
        </div>

        {/* CSM & Delivery Owners */}
        <div className="flex items-center gap-4">
          {clientData?.csm_owner && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">CSM:</span>
              <Avatar className="h-6 w-6">
                <AvatarImage src={clientData.csm_owner.avatar_url} />
                <AvatarFallback className="text-xs">
                  {getInitials(clientData.csm_owner.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{clientData.csm_owner.name}</span>
            </div>
          )}
          
          {clientData?.delivery_owners && clientData.delivery_owners.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Delivery:</span>
              <div className="flex -space-x-2">
                {clientData.delivery_owners.slice(0, 3).map((owner) => (
                  <Avatar key={owner.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={owner.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(owner.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Meeting Cadence & Next Meeting */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{cadenceLabels[clientData?.meeting_cadence || 'weekly'] || 'Weekly'}</span>
          </div>
          
          {nextMeeting && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Next: {format(new Date(nextMeeting.meeting_date), 'MMM d')}</span>
            </div>
          )}
        </div>

        {/* Health Status */}
        <HealthStatusSelector
          value={healthStatus}
          onChange={onHealthStatusChange}
        />

        {/* Last Touched */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Last touched: {lastCommunication 
              ? formatDistanceToNow(new Date(lastCommunication.created_at), { addSuffix: true })
              : 'Never'}
          </span>
        </div>
      </div>
    </div>
  );
}
