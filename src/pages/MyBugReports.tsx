import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Trophy, TrendingUp, ExternalLink, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MyBugReports() {
  const { data: bugReports, isLoading } = useQuery({
    queryKey: ["my-bug-reports"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .eq("reporter_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totalPoints = bugReports?.reduce((sum, bug) => sum + (bug.reward_points || 0), 0) || 0;
  const fixedCount = bugReports?.filter(bug => bug.status === "fixed").length || 0;
  const deniedCount = bugReports?.filter(bug => bug.status === "denied").length || 0;

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
      cosmetic: "outline",
    };
    return colors[severity] || "default";
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      submitted: "default",
      triaged: "secondary",
      in_progress: "default",
      fixed: "default",
      wont_fix: "outline",
      duplicate: "outline",
      denied: "destructive",
    };
    return colors[status] || "default";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bug className="h-8 w-8" />
              My Bug Reports
            </h1>
            <p className="text-muted-foreground">Track your submitted bugs and earned points</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Points Earned</p>
                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{totalPoints}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Bug className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reports Submitted</p>
                <p className="text-3xl font-bold">{bugReports?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bugs Fixed</p>
                <p className="text-3xl font-bold">{fixedCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Bug Reports List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Bug Reports</h2>
          
          {isLoading ? (
            <Card className="p-8 text-center">Loading your bug reports...</Card>
          ) : bugReports?.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>You haven't submitted any bug reports yet.</p>
              <p className="text-sm mt-2">Help us improve by reporting bugs you encounter!</p>
            </Card>
          ) : (
            bugReports?.map((bug) => (
              <Card key={bug.id} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{bug.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted {format(new Date(bug.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(bug.severity)}>
                        {bug.severity}
                      </Badge>
                      <Badge variant={getStatusColor(bug.status)}>
                        {bug.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm">{bug.description}</p>

                  {/* Screenshots */}
                  {bug.screenshot_urls && bug.screenshot_urls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {bug.screenshot_urls.map((url: string, idx: number) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group"
                        >
                          <img
                            src={url}
                            alt={`Screenshot ${idx + 1}`}
                            className="h-20 w-20 object-cover rounded border"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <ExternalLink className="h-5 w-5 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Denial Info */}
                  {bug.status === 'denied' && (
                    <Alert variant="destructive" className="mt-4">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Report Denied</strong>
                        <p className="text-sm mt-1">{bug.denial_reason}</p>
                        {bug.denied_at && (
                          <p className="text-xs mt-2 opacity-75">
                            Denied on {format(new Date(bug.denied_at), "MMM d, yyyy")}
                          </p>
                        )}
                        <p className="text-xs mt-2 font-semibold">No points awarded</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Points */}
                  {bug.reward_awarded && bug.status !== 'denied' && (
                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-semibold text-yellow-700 dark:text-yellow-300">
                        Earned {bug.reward_points} points!
                      </span>
                      {bug.status === "fixed" && (
                        <Badge variant="outline" className="ml-2">
                          ✓ Fixed
                        </Badge>
                      )}
                    </div>
                  )}

                  {!bug.reward_awarded && bug.status !== 'denied' && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Pending review</p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
  );
}
