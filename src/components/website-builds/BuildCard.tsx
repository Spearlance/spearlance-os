import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, CheckSquare } from "lucide-react";
import { format } from "date-fns";

interface BuildCardProps {
  build: {
    id: string;
    name: string;
    status: string;
    target_launch_date: string | null;
    scope_summary: string | null;
    created_at: string;
    pages: { count: number }[];
    linked_tasks: { count: number }[];
  };
  viewMode: "grid" | "list";
}

const statusColors: Record<string, string> = {
  planning: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  launched: "bg-green-500/10 text-green-500 border-green-500/20",
};

const statusLabels: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  launched: "Launched",
};

export function BuildCard({ build, viewMode }: BuildCardProps) {
  const navigate = useNavigate();
  const pagesCount = build.pages?.[0]?.count || 0;
  const tasksCount = build.linked_tasks?.[0]?.count || 0;

  if (viewMode === "list") {
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/website/builds/${build.id}`)}
      >
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="font-medium">{build.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {build.scope_summary || "No scope defined"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {pagesCount} pages
              </span>
              <span className="flex items-center gap-1">
                <CheckSquare className="h-4 w-4" />
                {tasksCount} tasks
              </span>
              {build.target_launch_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(build.target_launch_date), "MMM d, yyyy")}
                </span>
              )}
            </div>
            <Badge variant="outline" className={statusColors[build.status]}>
              {statusLabels[build.status]}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/website/builds/${build.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{build.name}</CardTitle>
          <Badge variant="outline" className={statusColors[build.status]}>
            {statusLabels[build.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {build.scope_summary || "No scope defined yet"}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {pagesCount} pages
          </span>
          <span className="flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            {tasksCount} tasks
          </span>
        </div>

        {build.target_launch_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Target: {format(new Date(build.target_launch_date), "MMM d, yyyy")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
