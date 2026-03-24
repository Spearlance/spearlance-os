import { useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Lock, MapPin, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PricingModal } from "@/components/billing/PricingModal";
import { useUserRole } from "@/hooks/useUserRole";
import { useLatestSEOReport } from "@/hooks/useSEOReports";
import { useLatestSEOKeywords, useUniqueRegions } from "@/hooks/useSEOKeywords";
import { UploadSEOReportDialog } from "@/components/seo/UploadSEOReportDialog";
import { SEOOverview } from "@/components/seo/SEOOverview";
import { SEOKeywordsTable } from "@/components/seo/SEOKeywordsTable";
import { BlogWriterMain } from "@/components/blog/BlogWriterMain";

export default function SEO() {
  const { selectedClient } = useClient();
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { role: userRole } = useUserRole();

  // SEO Reports data
  const { data: latestReport, isLoading: reportsLoading } = useLatestSEOReport(selectedClient?.id);
  const { data: keywords, isLoading: keywordsLoading } = useLatestSEOKeywords(selectedClient?.id);
  const { data: regions } = useUniqueRegions(selectedClient?.id);

  // Check if website is unlocked
  if (!selectedClient?.website_unlocked) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">SEO Tools</h1>
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-12 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-lg font-semibold">SEO Tools Available with Website</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upgrade to unlock website features including SEO tools
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8" />
            SEO Tools
          </h1>
          <p className="text-muted-foreground">Track keyword rankings and monitor your search performance</p>
        </div>
        {(userRole === 'admin' || userRole === 'fmm') && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload SE Ranking Report
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rankings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rankings">Keyword Rankings</TabsTrigger>
            <TabsTrigger value="blog">Blog Writer</TabsTrigger>
          <TabsTrigger value="pages" disabled>
            Local Landing Pages
            <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[10px] font-normal">Coming Soon</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-6">
          {!latestReport && !reportsLoading ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No SE Ranking Reports Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload your first SE Ranking PDF report to start tracking keyword positions and search visibility.
                </p>
                {(userRole === 'admin' || userRole === 'fmm') && (
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Report
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <SEOOverview 
                report={latestReport} 
                isLoading={reportsLoading} 
              />
              <SEOKeywordsTable
                keywords={keywords || []} 
                regions={regions || []}
                isLoading={keywordsLoading} 
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="blog" className="space-y-6">
          <BlogWriterMain />
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-4">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">Local Landing Page Builder - Coming Soon</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Automatically generate location-specific landing pages to target multiple cities and regions. 
                Perfect for local SEO and multi-location businesses.
              </p>
              <div className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto pt-4">
                <p className="font-medium">Planned Features:</p>
                <ul className="text-left list-disc list-inside space-y-1">
                  <li>Location-based content generation</li>
                  <li>Service selection from marketing profile</li>
                  <li>Template customization</li>
                  <li>Integration with website builder</li>
                  <li>Local SEO optimization</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      {selectedClient && (
        <UploadSEOReportDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          clientId={selectedClient.id}
        />
      )}
    </div>
  );
}
