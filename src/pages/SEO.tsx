import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Lock, FileText, MapPin, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PagePerformanceTable } from "@/components/analytics/PagePerformanceTable";
import { usePagePerformance } from "@/hooks/useAnalytics";
import { PricingModal } from "@/components/billing/PricingModal";
import { subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SEO() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile) setUserRole(profile.role);
      }
    };
    fetchUserRole();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analytics-refresh-views');
      if (error) throw error;
      
      toast({
        title: "Data refreshed",
        description: "Analytics data has been updated successfully",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh analytics data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data: pagePerformance, isLoading: pagesLoading } = usePagePerformance(
    selectedClient?.id || '',
    dateRange
  );

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
          <p className="text-muted-foreground">Optimize your website content for search engines and conversions</p>
        </div>
        {(userRole === 'admin' || userRole === 'fmm') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analysis">Page Analysis</TabsTrigger>
          <TabsTrigger value="blog" disabled>
            Blog Writer
            <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[10px] font-normal">Coming Soon</Badge>
          </TabsTrigger>
          <TabsTrigger value="pages" disabled>
            Local Landing Pages
            <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[10px] font-normal">Coming Soon</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">Content Analysis</h3>
              <p className="text-muted-foreground mb-4">
                AI-powered analysis of your website pages to identify strengths, weaknesses, and opportunities for improvement.
              </p>
            </CardContent>
          </Card>
          <PagePerformanceTable data={pagePerformance} isLoading={pagesLoading} />
        </TabsContent>

        <TabsContent value="blog" className="space-y-6">
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">AI Blog Writer - Coming Soon</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Generate SEO-optimized blog posts tailored to your target audience and brand voice. 
                This tool will integrate with your avatars, brand guide, and assets library to create compelling content.
              </p>
              <div className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto pt-4">
                <p className="font-medium">Planned Features:</p>
                <ul className="text-left list-disc list-inside space-y-1">
                  <li>Topic and keyword research</li>
                  <li>Target audience selection from avatars</li>
                  <li>Tone and style matching from brand guide</li>
                  <li>Auto-image selection from assets library</li>
                  <li>SEO optimization built-in</li>
                </ul>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
