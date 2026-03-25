import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AutoBlogMode = 'off' | 'queue' | 'auto_publish';

export function BlogAutoModeSettings() {
  const { selectedClient } = useClient();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-auto-blog-mode', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('auto_blog_mode')
        .eq('id', selectedClient.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClient,
  });

  const mutation = useMutation({
    mutationFn: async (mode: AutoBlogMode) => {
      if (!selectedClient) return;
      const { error } = await supabase
        .from('clients')
        .update({ auto_blog_mode: mode })
        .eq('id', selectedClient.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-auto-blog-mode', selectedClient?.id] });
    },
    onError: () => {
      toast.error('Failed to update auto-blog mode');
    },
  });

  const currentMode: AutoBlogMode = (client?.auto_blog_mode as AutoBlogMode) ?? 'queue';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Blog Mode</CardTitle>
        <CardDescription>
          Control how the pipeline handles auto-generated articles for this client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <RadioGroup
            value={currentMode}
            onValueChange={(v) => mutation.mutate(v as AutoBlogMode)}
            disabled={mutation.isPending}
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="off" id="mode-off" className="mt-0.5" />
              <div>
                <Label htmlFor="mode-off" className="font-medium cursor-pointer">Off</Label>
                <p className="text-sm text-muted-foreground">No auto-blog generation</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="queue" id="mode-queue" className="mt-0.5" />
              <div>
                <Label htmlFor="mode-queue" className="font-medium cursor-pointer">Queue for Review</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-generates articles and queues them for approval before publishing
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="auto_publish" id="mode-auto-publish" className="mt-0.5" />
              <div>
                <Label htmlFor="mode-auto-publish" className="font-medium cursor-pointer">Auto-Publish</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-generates and schedules articles directly without review
                </p>
              </div>
            </div>
          </RadioGroup>
        )}

        {currentMode === 'auto_publish' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Articles will be published without review. Make sure your quality gate thresholds are well-configured.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
