import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Settings, AlertCircle, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { TrafficSourcesChart } from "@/components/analytics/TrafficSourcesChart";

import { ContentPerformanceTable } from "@/components/analytics/ContentPerformanceTable";
import { VisitorsTimelineChart } from "@/components/analytics/VisitorsTimelineChart";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { 
  useAnalyticsOverview, 
  useTrafficSources, 
  useContentPerformance,
  useVisitorTimeline,
  useWorkspaceKey,
  useAnalyticsStatus,
} from "@/hooks/useAnalytics";
import { PricingModal } from "@/components/billing/PricingModal";
import { subDays, startOfDay, endOfDay } from "date-fns";

export default function Analytics() {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });
  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  // Calculate comparison date range
  const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  const comparisonDateRange = comparisonEnabled ? {
    from: subDays(dateRange.from, daysDiff),
    to: dateRange.from,
  } : undefined;

  // Fetch analytics data
  const { data: workspaceKey } = useWorkspaceKey(selectedClient?.id || '');
  const { data: status } = useAnalyticsStatus(selectedClient?.id || '');
  const { data: overviewData, isLoading: overviewLoading } = useAnalyticsOverview(
    selectedClient?.id || '',
    dateRange
  );
  const { data: comparisonData } = useAnalyticsOverview(
    selectedClient?.id || '',
    comparisonDateRange || dateRange
  );
  const { data: trafficSources, isLoading: trafficLoading } = useTrafficSources(
    selectedClient?.id || '',
    dateRange
  );
  const { data: contentPerformance, isLoading: contentLoading } = useContentPerformance(
    selectedClient?.id || '',
    dateRange
  );
  const { data: visitorTimeline, isLoading: timelineLoading } = useVisitorTimeline(
    selectedClient?.id || '',
    dateRange
  );

  // Check if website is unlocked
  if (!selectedClient?.website_unlocked) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-12 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-lg font-semibold">Analytics Available with Website</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upgrade to unlock website features including analytics tracking
            </p>
            <Button onClick={() => setPricingModalOpen(true)}>
              View Plans
            </Button>
          </CardContent>
        </Card>
        <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
      </div>
    );
  }

  // Check if workspace key is generated
  if (!workspaceKey) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <Button onClick={() => navigate('/settings?tab=integrations')}>
            <Settings className="h-4 w-4 mr-2" />
            Setup Analytics
          </Button>
        </div>
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center space-y-4">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Set Up Website Tracking</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Generate a workspace key to start tracking website visitors
            </p>
            <Button onClick={() => navigate('/settings?tab=integrations')}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if there's any data
  if (status && !status.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <Button variant="outline" onClick={() => navigate('/settings?tab=integrations')}>
            <Settings className="h-4 w-4 mr-2" />
            View Setup Instructions
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Waiting for Data</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Install the tracking code on your website to see analytics here
            </p>
            <Button variant="outline" onClick={() => navigate('/settings?tab=integrations')}>
              View Installation Instructions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your website performance and visitor behavior</p>
        </div>
        <div className="flex items-center gap-2">
          {status?.isLive && (
            <Badge variant="default" className="gap-1">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              Live
            </Badge>
          )}
          <Button variant="outline" onClick={() => navigate('/settings?tab=integrations')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparisonEnabled={comparisonEnabled}
        onComparisonToggle={setComparisonEnabled}
      />

      {/* Overview Metrics */}
      <AnalyticsOverview
        data={overviewData}
        isLoading={overviewLoading}
        comparisonData={comparisonEnabled ? comparisonData : undefined}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <VisitorsTimelineChart data={visitorTimeline} isLoading={timelineLoading} />
          <div className="grid gap-6 lg:grid-cols-2">
            <TrafficSourcesChart data={trafficSources} isLoading={trafficLoading} />
            <Card>
              <CardContent className="pt-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Overview Summary</AlertTitle>
                  <AlertDescription>
                    Your analytics dashboard shows key metrics for website performance.
                    Explore different tabs to dive deeper into traffic sources and content metrics.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <TrafficSourcesChart data={trafficSources} isLoading={trafficLoading} />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <ContentPerformanceTable data={contentPerformance} isLoading={contentLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
