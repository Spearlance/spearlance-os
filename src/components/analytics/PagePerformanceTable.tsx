import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Search, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useClient } from "@/contexts/ClientContext";
import { usePageAnalysis, useAnalyzePage } from "@/hooks/usePageAnalysis";
import { PageAnalysisDrawer } from "./PageAnalysisDrawer";

interface PageData {
  page_path: string;
  pageviews: number;
  unique_visitors: number;
  entry_sessions: number;
  avg_engaged_time: number;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  suggestion: string;
  example?: string;
}

interface PageAnalysis {
  id: string;
  page_id: string;
  overall_score: number;
  clarity_score: number;
  brevity_score: number;
  tone_score: number;
  avatar_alignment_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[] | any;
  analyzed_at: string;
  website_pages: {
    page_path: string;
    page_title: string;
    last_crawled_at: string;
  };
}

interface PagePerformanceTableProps {
  data?: PageData[];
  isLoading?: boolean;
}

export function PagePerformanceTable({ data, isLoading }: PagePerformanceTableProps) {
  const { selectedClient } = useClient();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof PageData>("pageviews");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<PageData | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<PageAnalysis | null>(null);

  const { data: analysisData } = usePageAnalysis(selectedClient?.id || '');
  const analyzePage = useAnalyzePage();
  const [analyzingPath, setAnalyzingPath] = useState<string | null>(null);

  // Create a map of page_path to analysis
  const analysisMap = new Map(
    analysisData?.map(analysis => [
      analysis.website_pages.page_path,
      analysis
    ]) || []
  );

  const handleSort = (field: keyof PageData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const getLetterGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getGradeBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const handleAnalyzePage = async (page: PageData) => {
    if (!selectedClient) return;
    setAnalyzingPath(page.page_path);
    
    try {
      const analysis = await analyzePage.mutateAsync({
        clientId: selectedClient.id,
        pagePath: page.page_path,
      });
      
      // Open drawer with new analysis
      setSelectedPage(page);
      setSelectedAnalysis({
        ...analysis,
        recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
        website_pages: {
          page_path: page.page_path,
          page_title: page.page_path,
          last_crawled_at: new Date().toISOString(),
        }
      } as PageAnalysis);
      setDrawerOpen(true);
    } finally {
      setAnalyzingPath(null);
    }
  };

  const handleViewAnalysis = (page: PageData, analysis: PageAnalysis) => {
    setSelectedPage(page);
    setSelectedAnalysis(analysis);
    setDrawerOpen(true);
  };

  const handleReAnalyze = async () => {
    if (!selectedClient || !selectedPage) return;
    await handleAnalyzePage(selectedPage);
  };

  const handleDisregard = async () => {
    if (!selectedAnalysis) return;
    // Will be handled by the mutation hook
    setDrawerOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Page Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Page Performance</CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No page data available</p>
        </CardContent>
      </Card>
    );
  }

  const filteredData = data.filter(page =>
    page.page_path.toLowerCase().includes(search.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aVal > bVal ? 1 : -1) * multiplier;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Page Performance</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('page_path')}>
                    Page Path
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('pageviews')}>
                    Pageviews
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('unique_visitors')}>
                    Unique Visitors
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Content Grade</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.slice(0, 20).map((page, index) => {
                const analysis = analysisMap.get(page.page_path);
                const isAnalyzing = analyzingPath === page.page_path;
                
                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{page.page_path}</TableCell>
                    <TableCell>{page.pageviews.toLocaleString()}</TableCell>
                    <TableCell>{page.unique_visitors.toLocaleString()}</TableCell>
                    <TableCell>
                      {analysis ? (
                        <Badge variant={getGradeBadgeVariant(analysis.overall_score)}>
                          {getLetterGrade(analysis.overall_score)} ({analysis.overall_score})
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {analysis ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewAnalysis(page, analysis)}
                        >
                          View Analysis
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAnalyzePage(page)}
                          disabled={isAnalyzing || analyzePage.isPending}
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            'Analyze Page'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {sortedData.length > 20 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Showing top 20 of {sortedData.length} pages
          </p>
        )}
      </CardContent>
    </Card>

    {selectedPage && selectedAnalysis && (
      <PageAnalysisDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        page={selectedPage}
        analysis={selectedAnalysis}
        onReAnalyze={handleReAnalyze}
        onDisregard={handleDisregard}
        isAnalyzing={analyzePage.isPending}
      />
    )}
    </>
  );
}
