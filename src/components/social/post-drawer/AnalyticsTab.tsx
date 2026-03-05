import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, BarChart3, Info } from "lucide-react";
import { format } from "date-fns";
import { PostAnalytics } from "../PostAnalytics";

interface Post {
  id: string;
  scheduled_date: string;
  post_idea_json: any;
  caption_text: string | null;
  image_url: string | null;
  platform: string[] | null;
  status: string;
}

interface AnalyticsTabProps {
  post: Post;
  analytics: any[];
  analyticsLastSynced: string | null;
  isRefreshingAnalytics: boolean;
  onRefreshAnalytics: () => void;
}

export const AnalyticsTab = ({
  post,
  analytics,
  analyticsLastSynced,
  isRefreshingAnalytics,
  onRefreshAnalytics,
}: AnalyticsTabProps) => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Post Performance</h3>
          {analyticsLastSynced && (
            <p className="text-sm text-muted-foreground">
              Last updated: {format(new Date(analyticsLastSynced), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={onRefreshAnalytics}
          disabled={isRefreshingAnalytics || !(post as any).late_post_id}
        >
          {isRefreshingAnalytics ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      <Separator />

      {analytics.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="font-semibold mb-2">No Analytics Yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {!(post as any).late_post_id
              ? "Schedule this post through Late to track analytics."
              : (post as any).late_status !== "published"
              ? "Analytics will be available after the post is published."
              : "Click 'Refresh' to sync analytics from your social platforms."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {analytics.map((analyticsData: any) => (
            <PostAnalytics key={analyticsData.id} analytics={analyticsData} />
          ))}
        </div>
      )}

      {(post as any).late_status === "published" && analytics.length === 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Analytics Add-on Required</p>
              <p className="text-blue-700 dark:text-blue-300">
                To track detailed performance metrics for your social posts, you'll need the Late
                Analytics add-on. This provides insights on impressions, reach, engagement, and more
                across all your platforms.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
