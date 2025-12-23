import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { GenerateReportDialog } from "@/components/reports/GenerateReportDialog";
import { AIReportViewer } from "@/components/reports/AIReportViewer";

export interface AIReport {
  id: string;
  report_type: string;
  report_name: string;
  date_range_start: string;
  date_range_end: string;
  executive_summary: string | null;
  report_content: string;
  created_at: string;
}

interface ReportsCardProps {
  reports: AIReport[];
  clientId: string;
  onReportGenerated: () => void;
}

const reportTypeLabels: Record<string, string> = {
  performance_summary: "Performance",
  channel_deep_dive: "Channel",
  website_analytics: "Website",
  seo_report: "SEO",
};

export function ReportsCard({ reports, clientId, onReportGenerated }: ReportsCardProps) {
  const navigate = useNavigate();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const handleViewReport = (report: AIReport) => {
    setSelectedReport(report);
    setViewerOpen(true);
  };

  const handleReportCreated = () => {
    setGenerateOpen(false);
    onReportGenerated();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Reports
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setGenerateOpen(true)}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate AI Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No AI reports yet</p>
              <p className="text-xs mt-1">Generate your first report to get started</p>
            </div>
          ) : (
            <>
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleViewReport(report)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground truncate">
                          {report.report_name}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <Sparkles className="h-2.5 w-2.5 mr-1" />
                          {reportTypeLabels[report.report_type] || report.report_type}
                        </Badge>
                      </div>
                      {report.executive_summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {report.executive_summary}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(report.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/reports")}
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
              >
                View All Reports
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <GenerateReportDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        clientId={clientId}
        onSuccess={handleReportCreated}
      />

      {selectedReport && (
        <AIReportViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          report={{
            id: selectedReport.id,
            client_id: clientId,
            report_name: selectedReport.report_name,
            report_type: selectedReport.report_type,
            date_range_start: selectedReport.date_range_start,
            date_range_end: selectedReport.date_range_end,
            report_content: selectedReport.report_content,
            executive_summary: selectedReport.executive_summary,
            created_at: selectedReport.created_at,
          }}
          onDelete={onReportGenerated}
        />
      )}
    </>
  );
}
