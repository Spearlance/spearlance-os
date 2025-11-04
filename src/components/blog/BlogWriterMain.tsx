import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { MainLayout } from "@/components/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { BlogStrategyForm } from "./BlogStrategyForm";
import { BlogMonthlyGenerator } from "./BlogMonthlyGenerator";
import { BlogPostsList } from "./BlogPostsList";

export function BlogWriterMain() {
  const { selectedClient, loading: clientLoading } = useClient();
  const [activeTab, setActiveTab] = useState<'strategy' | 'generate' | 'drafts' | 'published'>('strategy');
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: draftsCount } = useQuery({
    queryKey: ['blog-drafts-count', selectedClient?.id, refreshKey],
    queryFn: async () => {
      if (!selectedClient) return 0;
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', selectedClient.id)
        .eq('status', 'draft');
      return count || 0;
    },
    enabled: !!selectedClient,
  });

  const { data: publishedCount } = useQuery({
    queryKey: ['blog-published-count', selectedClient?.id, refreshKey],
    queryFn: async () => {
      if (!selectedClient) return 0;
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', selectedClient.id)
        .eq('status', 'published');
      return count || 0;
    },
    enabled: !!selectedClient,
  });

  if (clientLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!selectedClient) {
    return (
      <MainLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to manage their blog content.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Blog Writer</h1>
          <p className="text-muted-foreground">
            Plan your content strategy, generate topics in bulk, and create SEO-optimized articles
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="drafts">
              Drafts
              {draftsCount !== undefined && draftsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {draftsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="published">
              Published
              {publishedCount !== undefined && publishedCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {publishedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strategy" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Content Strategy</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Define your posting frequency and content mix to generate perfectly balanced blog topics
              </p>
              <BlogStrategyForm clientId={selectedClient.id} />
            </Card>
          </TabsContent>

          <TabsContent value="generate">
            <BlogMonthlyGenerator clientId={selectedClient.id} />
          </TabsContent>

          <TabsContent value="drafts">
            <BlogPostsList status="draft" key={`drafts-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="published">
            <BlogPostsList status="published" key={`published-${refreshKey}`} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
