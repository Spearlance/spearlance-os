import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Settings, Lock, ExternalLink } from "lucide-react";
import { ClarityOverview } from "@/components/analytics/ClarityOverview";
import { ClaritySourcesChart } from "@/components/analytics/ClaritySourcesChart";
import { ClarityTopPagesTable } from "@/components/analytics/ClarityTopPagesTable";
import { ClarityTimelineChart } from "@/components/analytics/ClarityTimelineChart";
import { ClarityBehavioralCard } from "@/components/analytics/ClarityBehavioralCard";
import { CWVGauges } from "@/components/analytics/CWVGauges";
import { LighthouseScoreCard } from "@/components/analytics/LighthouseScoreCard";
import { GA4StatusCard } from "@/components/analytics/GA4StatusCard";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import {
  useClarityStatus,
  useClarityOverview,
  useClarityTimeline,
  useClaritySources,
  useClarityPages,
  useClarityBehavioral,
} from "@/hooks/useClarityAnalytics";
import { useCWVMetrics, useLighthouseAudits } from "@/hooks/usePerformanceData";
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

  // Fetch Clarity status and data
  const { data: status, isLoading: statusLoading } = useClarityStatus(selectedClient?.id || '');
  const { data: overviewData, isLoading: overviewLoading } = useClarityOverview(
    selectedClient?.id || '',
    dateRange
  );
  const { data: comparisonData } = useClarityOverview(
    selectedClient?.id || '',
    comparisonDateRange || dateRange
  );
  const { data: timelineData, isLoading: timelineLoading } = useClarityTimeline(
    selectedClient?.id || '',
    dateRange
  );
  const { data: sourcesData, isLoading: sourcesLoading } = useClaritySources(
    selectedClient?.id || '',
    dateRange
  );
  const { data: pagesData, isLoading: pagesLoading } = useClarityPages(
    selectedClient?.id || '',
    dateRange
  );
  const { data: behavioralData, isLoading: behavioralLoading } = useClarityBehavioral(
    selectedClient?.id || '',
    dateRange
  );

  // Performance data (CWV + Lighthouse)
  const { data: cwvData, isLoading: cwvLoading } = useCWVMetrics(selectedClient?.id);
  const { data: lighthouseData, isLoading: lighthouseLoading } = useLighthouseAudits(selectedClient?.id);

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

  // Check if Clarity is configured
  if (!statusLoading && !status?.isConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <Button onClick={() => navigate('/settings?tab=integrations')}>
            <Settings className="h-4 w-4 mr-2" />
            Connect Clarity
          </Button>
        </div>
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center space-y-4">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Connect Microsoft Clarity</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your Microsoft Clarity account to see detailed analytics including session recordings, heatmaps, and behavioral insights.
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
  if (!statusLoading && status?.isConfigured && !status?.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <Button variant="outline" onClick={() => navigate('/settings?tab=integrations')}>
            <Settings className="h-4 w-4 mr-2" />
            View Settings
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Waiting for Data</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Clarity is connected but no data has been synced yet. Data is synced daily at 6 AM UTC, or you can trigger a manual sync from settings.
            </p>
            <Button variant="outline" onClick={() => navigate('/settings?tab=integrations')}>
              Sync Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clarityDashboardUrl = status?.projectId 
    ? `https://clarity.microsoft.com/projects/view/${status.projectId}/dashboard`
    : 'https://clarity.microsoft.com';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your website performance and visitor behavior</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(clarityDashboardUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View in Clarity
          </Button>
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
      <ClarityOverview
        data={overviewData}
        isLoading={overviewLoading}
        comparisonData={comparisonEnabled ? comparisonData : undefined}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ga4">GA4</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="behavior">Behavioral Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ClarityTimelineChart data={timelineData} isLoading={timelineLoading} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ClaritySourcesChart data={sourcesData} isLoading={sourcesLoading} />
            <ClarityBehavioralCard data={behavioralData} isLoading={behavioralLoading} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <CWVGauges data={cwvData} isLoading={cwvLoading} />
          <LighthouseScoreCard audits={lighthouseData || []} isLoading={lighthouseLoading} />
        </TabsContent>

        <TabsContent value="ga4" className="space-y-6">
          <GA4StatusCard clientId={selectedClient?.id} />
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <ClaritySourcesChart data={sourcesData} isLoading={sourcesLoading} />
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <ClarityTopPagesTable data={pagesData} isLoading={pagesLoading} />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <ClarityBehavioralCard data={behavioralData} isLoading={behavioralLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
