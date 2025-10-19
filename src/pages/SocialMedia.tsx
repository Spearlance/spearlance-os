import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PostCreator } from "@/components/social/PostCreator";
import { PostScheduler } from "@/components/social/PostScheduler";
import { PostsList } from "@/components/social/PostsList";
import { SocialMediaCallout } from "@/components/social/SocialMediaCallout";
import { MonthlyPlannerWizard } from "@/components/social/MonthlyPlannerWizard";
import { MonthlyCalendarTable } from "@/components/social/MonthlyCalendarTable";
import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SocialMedia = () => {
  const { selectedClient, loading: clientLoading } = useClient();
  const [activeTab, setActiveTab] = useState("planner");
  const [showMonthlyWizard, setShowMonthlyWizard] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: monthlyPosts, refetch } = useQuery({
    queryKey: ['monthly-posts', selectedClient?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!selectedClient) return [];
      
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);

      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('client_id', selectedClient.id)
        .gte('scheduled_date', startDate.toISOString())
        .lte('scheduled_date', endDate.toISOString())
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient,
  });

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to manage their social media.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Social Media</h1>
        <p className="text-muted-foreground mt-2">
          Create and schedule posts that perfectly match your brand
        </p>
      </div>

      <SocialMediaCallout />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="planner">Monthly Planner</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="creator">Single Post</TabsTrigger>
          </TabsList>
          
          {activeTab === "planner" && (!monthlyPosts || monthlyPosts.length === 0) && (
            <Button onClick={() => setShowMonthlyWizard(true)} size="lg">
              <Calendar className="h-4 w-4 mr-2" />
              Generate Monthly Plan
            </Button>
          )}
        </div>

        <TabsContent value="planner" className="space-y-6">
          {monthlyPosts && monthlyPosts.length > 0 ? (
            <MonthlyCalendarTable posts={monthlyPosts} onRefresh={refetch} />
          ) : (
            <div className="text-center py-12 space-y-4">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Monthly Plan Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate 30 posts for this month in seconds with AI
                </p>
                <Button onClick={() => setShowMonthlyWizard(true)} size="lg">
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Monthly Plan
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="space-y-6">
          <PostsList />
        </TabsContent>

        <TabsContent value="creator" className="space-y-6">
          <PostCreator />
        </TabsContent>
      </Tabs>

      <MonthlyPlannerWizard 
        open={showMonthlyWizard}
        onOpenChange={setShowMonthlyWizard}
        onComplete={() => refetch()}
      />
    </div>
  );
};

export default SocialMedia;