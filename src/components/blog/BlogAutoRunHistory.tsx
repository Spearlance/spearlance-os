import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

type TriggerType = 'scheduled' | 'manual';
type RunStatus = 'running' | 'completed' | 'failed';

interface AutoRun {
  id: string;
  triggered_at: string;
  trigger_type: TriggerType;
  status: RunStatus;
  topics_generated: number | null;
  articles_passed: number | null;
  articles_flagged: number | null;
}

function TriggerBadge({ type }: { type: TriggerType }) {
  return (
    <Badge variant="outline" className="text-xs">
      {type === 'scheduled' ? 'Scheduled' : 'Manual'}
    </Badge>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const variants: Record<RunStatus, string> = {
    running: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
  };
  const labels: Record<RunStatus, string> = {
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[status]}`}>
      {labels[status]}
    </span>
  );
}

export function BlogAutoRunHistory() {
  const { selectedClient } = useClient();

  const { data: runs, isLoading } = useQuery({
    queryKey: ['blog-auto-runs', selectedClient?.id],
    queryFn: async (): Promise<AutoRun[]> => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from('blog_auto_runs')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('triggered_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : !runs || runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No auto-blog runs yet. Configure auto-mode above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium pr-4">Date</th>
                  <th className="pb-2 font-medium pr-4">Trigger</th>
                  <th className="pb-2 font-medium pr-4">Status</th>
                  <th className="pb-2 font-medium pr-4 text-right">Topics</th>
                  <th className="pb-2 font-medium pr-4 text-right">Passed</th>
                  <th className="pb-2 font-medium text-right">Flagged</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                      {format(new Date(run.triggered_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="py-2 pr-4">
                      <TriggerBadge type={run.trigger_type} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {run.topics_generated ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-green-700">
                      {run.articles_passed ?? '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums text-red-700">
                      {run.articles_flagged ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
