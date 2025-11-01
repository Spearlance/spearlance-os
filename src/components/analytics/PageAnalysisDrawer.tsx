import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, Lightbulb, RefreshCw, X, BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  suggestion: string;
  example?: string;
}

interface Analysis {
  overall_score: number;
  clarity_score: number;
  brevity_score: number;
  tone_score: number;
  avatar_alignment_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  analyzed_at: string;
}

interface PageAnalysisDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: {
    page_path: string;
    page_title?: string;
    pageviews: number;
    unique_visitors: number;
    avg_engaged_time: number;
    last_crawled_at?: string;
  };
  analysis: Analysis;
  onReAnalyze: () => void;
  onDisregard: () => void;
  isAnalyzing?: boolean;
}

export function PageAnalysisDrawer({
  open,
  onOpenChange,
  page,
  analysis,
  onReAnalyze,
  onDisregard,
  isAnalyzing = false,
}: PageAnalysisDrawerProps) {
  const getLetterGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPriorityBadgeVariant = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Page Content Analysis</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Page Info */}
          <div>
            <h3 className="text-lg font-semibold">{page.page_title || page.page_path}</h3>
            <p className="text-sm text-muted-foreground font-mono">{page.page_path}</p>
            {page.last_crawled_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Last crawled: {format(new Date(page.last_crawled_at), 'PPp')}
              </p>
            )}
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Performance Metrics</span>
              </div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-semibold">{page.pageviews.toLocaleString()} views</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold">{page.unique_visitors.toLocaleString()} visitors</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold">{formatTime(page.avg_engaged_time)} avg. time</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Score Cards */}
          <div>
            <h4 className="font-semibold mb-3">Content Scores</h4>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Clarity', score: analysis.clarity_score },
                { label: 'Brevity', score: analysis.brevity_score },
                { label: 'Tone', score: analysis.tone_score },
                { label: 'Avatar', score: analysis.avatar_alignment_score },
              ].map(({ label, score }) => (
                <Card key={label}>
                  <CardContent className="pt-4 text-center">
                    <div className={`text-2xl font-bold ${getGradeColor(score)}`}>
                      {getLetterGrade(score)}
                    </div>
                    <div className="text-sm text-muted-foreground">{score}</div>
                    <div className="text-xs text-muted-foreground mt-1">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm text-muted-foreground">Overall Grade: </span>
              <span className={`text-xl font-bold ${getGradeColor(analysis.overall_score)}`}>
                {getLetterGrade(analysis.overall_score)} ({analysis.overall_score}/100)
              </span>
            </div>
          </div>

          <Separator />

          {/* Strengths */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h4 className="font-semibold">Strengths</h4>
            </div>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h4 className="font-semibold">Areas for Improvement</h4>
            </div>
            <ul className="space-y-2">
              {analysis.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold">Recommendations</h4>
            </div>
            <div className="space-y-3">
              {analysis.recommendations
                .sort((a, b) => {
                  const priority = { high: 0, medium: 1, low: 2 };
                  return priority[a.priority] - priority[b.priority];
                })
                .map((rec, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{rec.category}</Badge>
                      </div>
                      <p className="text-sm font-medium mb-1">{rec.issue}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-semibold">Suggestion:</span> {rec.suggestion}
                      </p>
                      {rec.example && (
                        <div className="bg-muted p-2 rounded text-xs">
                          <span className="font-semibold">Example:</span> {rec.example}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={onReAnalyze} className="flex-1" disabled={isAnalyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Re-analyze Page
            </Button>
            <Button onClick={onDisregard} variant="outline" disabled={isAnalyzing}>
              <X className="h-4 w-4 mr-2" />
              Disregard
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
