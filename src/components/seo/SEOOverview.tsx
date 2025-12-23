import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Hash } from "lucide-react";
import { SEOReport } from "@/hooks/useSEOReports";
import { format } from "date-fns";

interface SEOOverviewProps {
  report: SEOReport | null;
  isLoading?: boolean;
}

export function SEOOverview({ report, isLoading }: SEOOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-3 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-full">
          <CardContent className="py-8 text-center text-muted-foreground">
            No SEO reports uploaded yet. Upload an SE Ranking PDF to see your keyword rankings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Report from {report.date_range_start && report.date_range_end
            ? `${format(new Date(report.date_range_start), 'MMM d')} - ${format(new Date(report.date_range_end), 'MMM d, yyyy')}`
            : format(new Date(report.report_date), 'MMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Position */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Avg. Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.average_position?.toFixed(1) || '—'}
            </div>
          </CardContent>
        </Card>

        {/* Keywords Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              Top 10 Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.keywords_top_10}
            </div>
            <div className="text-sm text-muted-foreground">
              {report.keywords_top_3} in Top 3
            </div>
          </CardContent>
        </Card>

        {/* Total Keywords */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              Total Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.keywords_total}
            </div>
            <div className="text-sm text-muted-foreground">
              {report.keywords_top_30} in Top 30
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
