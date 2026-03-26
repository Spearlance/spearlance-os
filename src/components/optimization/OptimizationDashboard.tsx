import { useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { RecommendationCard } from "./RecommendationCard";
import {
  useOptimizationRecommendations,
  useOptimizationStats,
  useOptimizationCycles,
  useUpdateRecommendationStatus,
} from "@/hooks/useOptimizationData";

const APPLIED_STATUSES = ["applied", "monitoring", "succeeded", "regressed", "reverted"];

const CATEGORY_COLORS: Record<string, string> = {
  seo: "bg-blue-500",
  cro: "bg-purple-500",
  content: "bg-green-500",
  alert: "bg-orange-500",
};

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200",
  medium: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200",
  low: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300",
};

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilterBar({
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
}: {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  priorityFilter: string;
  setPriorityFilter: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          <SelectItem value="seo">SEO</SelectItem>
          <SelectItem value="cro">CRO</SelectItem>
          <SelectItem value="content">Content</SelectItem>
          <SelectItem value="alert">Alert</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function OptimizationDashboard() {
  const { selectedClient } = useClient();

  // Queue filters — single-select values, "all" means no filter
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const buildFilterArrays = (status: string, category: string, priority: string) => ({
    status: status === "all" ? ["pending", "approved"] : [status],
    category: category === "all" ? [] : [category],
    priority: priority === "all" ? [] : [priority],
  });

  const queueFilters = buildFilterArrays(statusFilter, categoryFilter, priorityFilter);
  const appliedFilters = { status: APPLIED_STATUSES, category: [], priority: [] };

  const { data: queueRecs, isLoading: queueLoading } = useOptimizationRecommendations(
    selectedClient?.id || "",
    queueFilters
  );

  const { data: appliedRecs, isLoading: appliedLoading } = useOptimizationRecommendations(
    selectedClient?.id || "",
    appliedFilters
  );

  const { data: stats } = useOptimizationStats(selectedClient?.id || "");
  const { data: cycles } = useOptimizationCycles(selectedClient?.id || "");
  const updateStatus = useUpdateRecommendationStatus();

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  // Applied tab summary
  const appliedCount = appliedRecs?.length ?? 0;
  const succeededCount = appliedRecs?.filter((r) => r.status === "succeeded").length ?? 0;
  const regressedCount = appliedRecs?.filter((r) => r.status === "regressed").length ?? 0;

  // Overview stats
  const pendingCount = stats?.byStatus["pending"] ?? 0;
  const totalSucceeded = stats?.byStatus["succeeded"] ?? 0;
  const totalRegressed = stats?.byStatus["regressed"] ?? 0;
  const successRate =
    totalSucceeded + totalRegressed > 0
      ? Math.round((totalSucceeded / (totalSucceeded + totalRegressed)) * 100)
      : null;

  const latestCycle = cycles?.[0];

  // Sort applied recs by applied_at DESC
  const sortedApplied = [...(appliedRecs ?? [])].sort((a, b) => {
    if (!a.applied_at && !b.applied_at) return 0;
    if (!a.applied_at) return 1;
    if (!b.applied_at) return -1;
    return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
  });

  return (
    <Tabs defaultValue="queue" className="space-y-4">
      <TabsList>
        <TabsTrigger value="queue" className="gap-1.5">
          <Clock className="h-4 w-4" />
          Queue
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="applied" className="gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          Applied
        </TabsTrigger>
        <TabsTrigger value="overview" className="gap-1.5">
          <BarChart3 className="h-4 w-4" />
          Overview
        </TabsTrigger>
      </TabsList>

      {/* ── Queue Tab ── */}
      <TabsContent value="queue" className="space-y-4">
        <FilterBar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
        />

        {queueLoading ? (
          <SkeletonCards />
        ) : !queueRecs || queueRecs.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No recommendations yet. Run an optimization cycle to generate recommendations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {queueRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatus.isPending}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Applied Tab ── */}
      <TabsContent value="applied" className="space-y-4">
        {appliedCount > 0 && (
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{appliedCount} changes applied</span>
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {succeededCount} succeeded
            </span>
            {regressedCount > 0 && (
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {regressedCount} regressed
              </span>
            )}
          </div>
        )}

        {appliedLoading ? (
          <SkeletonCards />
        ) : !sortedApplied || sortedApplied.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No applied changes yet. Approve and apply recommendations from the Queue.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedApplied.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatus.isPending}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Overview Tab ── */}
      <TabsContent value="overview" className="space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </CardContent>
          </Card>

          <Card className={pendingCount > 0 ? "border-yellow-400 dark:border-yellow-600" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                {pendingCount > 0 && <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                {pendingCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {successRate !== null ? `${successRate}%` : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Latest Cycle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold">
                {latestCycle
                  ? format(new Date(latestCycle.cycle_date), "MMM d, yyyy")
                  : "—"}
              </p>
              {latestCycle?.status && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {latestCycle.status}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category + Priority breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">By Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats && Object.keys(stats.byCategory).length > 0 ? (
                Object.entries(stats.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => {
                    const maxCount = Math.max(...Object.values(stats.byCategory));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium capitalize">{category}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${CATEGORY_COLORS[category] ?? "bg-gray-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Priority breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">By Priority</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {stats && Object.keys(stats.byPriority).length > 0 ? (
                ["critical", "high", "medium", "low"].map((priority) => {
                  const count = stats.byPriority[priority];
                  if (!count) return null;
                  return (
                    <Badge
                      key={priority}
                      variant="outline"
                      className={`text-sm px-3 py-1 ${PRIORITY_BADGE_CLASSES[priority] ?? ""}`}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}: {count}
                    </Badge>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Latest cycle info */}
        {latestCycle && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Latest Optimization Cycle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {format(new Date(latestCycle.cycle_date), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">{latestCycle.status}</Badge>
              </div>
              {latestCycle.recommendations_generated != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recommendations Generated</span>
                  <span className="font-medium">{latestCycle.recommendations_generated}</span>
                </div>
              )}
              {latestCycle.pages_analyzed != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pages Analyzed</span>
                  <span className="font-medium">{latestCycle.pages_analyzed}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
