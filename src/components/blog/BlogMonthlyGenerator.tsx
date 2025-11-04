import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Loader2, Sparkles, FileText } from "lucide-react";
import { format } from "date-fns";

interface BlogMonthlyGeneratorProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  month: number;
  year: number;
  generationType: 'all' | 'missing';
  existingTopicDates: string[];
  expectedPostCount: number;
  activeStrategy: any;
}

export function BlogMonthlyGenerator({ 
  clientId, 
  open, 
  onOpenChange, 
  onComplete,
  month,
  year,
  generationType,
  existingTopicDates,
  expectedPostCount,
  activeStrategy
}: BlogMonthlyGeneratorProps) {
  const queryClient = useQueryClient();

  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ["blog-batch", clientId, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_strategy_batches")
        .select("*")
        .eq("client_id", clientId)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["blog-topics", clientId, month, year],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0).toISOString();

      const { data, error } = await supabase
        .from("blog_topics")
        .select("*, blog_posts(*)")
        .eq("client_id", clientId)
        .gte("suggested_publish_date", startDate)
        .lte("suggested_publish_date", endDate)
        .order("suggested_publish_date");

      if (error) throw error;
      return data;
    },
    enabled: !!batch,
  });

  const generateTopicsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("blog-generate-monthly-topics", {
        body: { client_id: clientId, month, year },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-batch", clientId] });
      queryClient.invalidateQueries({ queryKey: ["blog-topics", clientId] });
      toast.success("Blog topics generated successfully!");
      onComplete();
    },
    onError: (error) => {
      console.error("Error generating topics:", error);
      toast.error("Failed to generate topics");
    },
  });

  const isLoading = batchLoading || topicsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Blog Topics for {format(new Date(year, month - 1), "MMMM yyyy")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">

          {isLoading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ) : !batch ? (
            <Card className="p-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">No topics generated yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Generate blog topics for {format(new Date(year, month - 1), "MMMM yyyy")} based on your content strategy
              </p>
              <Button
                onClick={() => generateTopicsMutation.mutate()}
                disabled={generateTopicsMutation.isPending}
              >
                {generateTopicsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Topics
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {batch.total_topics} topics for {format(new Date(year, month - 1), "MMMM yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {batch.topics_with_articles} with articles • {batch.total_topics - batch.topics_with_articles} pending
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateTopicsMutation.mutate()}
                    disabled={generateTopicsMutation.isPending}
                  >
                    {generateTopicsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Regenerate
                  </Button>
                </div>
              </Card>

              <div className="grid gap-4">
                {topics?.map((topic) => (
                  <Card key={topic.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{topic.topic_title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {topic.category?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{topic.summary}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          {topic.suggested_publish_date && format(new Date(topic.suggested_publish_date), "MMM d, yyyy")}
                        </div>
                        {topic.keywords && topic.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {topic.keywords.map((keyword: string) => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {topic.blog_posts && Array.isArray(topic.blog_posts) && topic.blog_posts.length > 0 ? (
                          <Badge variant="default" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Article Ready
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Article
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}