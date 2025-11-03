import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogCreationDialog } from "./BlogCreationDialog";
import { BlogTopicGenerator } from "./BlogTopicGenerator";
import { BlogPostsList } from "./BlogPostsList";
import { PenTool, Lightbulb, FileText, CheckCircle, ChevronDown, Sparkles, PlusCircle } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function BlogWriterMain() {
  const { selectedClient, loading: clientLoading } = useClient();
  const [activeTab, setActiveTab] = useState<'write' | 'topics' | 'drafts' | 'published'>('write');
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [creationType, setCreationType] = useState<'single' | 'from-topic'>('single');
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

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1);
    setShowCreationDialog(false);
    setActiveTab('drafts');
  };

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
            Please select a client to manage their blog content.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Blog Writer</h1>
        <p className="text-muted-foreground mt-2">
          Create high-quality blog content with AI, generate images, and publish directly to your website.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="write">
            <PenTool className="h-4 w-4 mr-2" />
            Write
          </TabsTrigger>
          <TabsTrigger value="topics">
            <Lightbulb className="h-4 w-4 mr-2" />
            Topics
          </TabsTrigger>
          <TabsTrigger value="drafts">
            <FileText className="h-4 w-4 mr-2" />
            Drafts
            {draftsCount !== undefined && draftsCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {draftsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published">
            <CheckCircle className="h-4 w-4 mr-2" />
            Published
            {publishedCount !== undefined && publishedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {publishedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Choose how you'd like to create your blog post
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Blog Post
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => {
                  setCreationType('single');
                  setShowCreationDialog(true);
                }}>
                  <PenTool className="h-4 w-4 mr-2" />
                  <div className="flex-1">
                    <div>Write Single Post</div>
                    <div className="text-xs text-muted-foreground">Step-by-step wizard</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setCreationType('from-topic');
                  setShowCreationDialog(true);
                }}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  <div className="flex-1">
                    <div>Generate from Topic</div>
                    <div className="text-xs text-muted-foreground">Use saved topic ideas</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6">
              <PenTool className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Write Single Post</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create a complete blog post with AI assistance. Define your topic, generate an outline, write the article, and add images.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCreationType('single');
                  setShowCreationDialog(true);
                }}
              >
                Start Writing
              </Button>
            </div>

            <div className="border rounded-lg p-6">
              <Sparkles className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generate from Topic</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Have topic ideas saved? Generate a complete blog post from your saved topics with one click.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCreationType('from-topic');
                  setShowCreationDialog(true);
                }}
              >
                Use Topic
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="topics" className="space-y-6">
          <BlogTopicGenerator />
        </TabsContent>

        <TabsContent value="drafts" className="space-y-6">
          <BlogPostsList status="draft" key={`drafts-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="published" className="space-y-6">
          <BlogPostsList status="published" key={`published-${refreshKey}`} />
        </TabsContent>
      </Tabs>

      <BlogCreationDialog
        open={showCreationDialog}
        onOpenChange={setShowCreationDialog}
        onComplete={handlePostCreated}
        creationType={creationType}
      />
    </div>
  );
}
