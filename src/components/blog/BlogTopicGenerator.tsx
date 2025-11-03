import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, ArrowRight } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Topic {
  id?: string;
  title: string;
  description: string;
  keywords: string[];
  avatar_name: string;
  priority: 'high' | 'medium' | 'low';
  content_angle: string;
  reasoning: string;
}

export function BlogTopicGenerator() {
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);

  const generateTopics = async () => {
    if (!selectedClient) {
      toast.error("Please select a client first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generate-topics', {
        body: {
          client_id: selectedClient.id,
          num_topics: 5
        }
      });

      if (error) throw error;

      if (data.success) {
        setTopics(data.topics);
        toast.success(`Generated ${data.topics.length} topic ideas!`);
      }
    } catch (error) {
      console.error('Error generating topics:', error);
      toast.error("Failed to generate topics");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Topic Ideas</h3>
          <p className="text-sm text-muted-foreground">
            Generate blog topic ideas tailored to your audience
          </p>
        </div>
        <Button onClick={generateTopics} disabled={loading || !selectedClient}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4 mr-2" />
              Generate Topics
            </>
          )}
        </Button>
      </div>

      {topics.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Click "Generate Topics" to get AI-powered blog post ideas
          </p>
        </Card>
      )}

      {topics.length > 0 && (
        <div className="grid gap-4">
          {topics.map((topic, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2">{topic.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {topic.description}
                  </p>
                </div>
                <Badge variant={getPriorityColor(topic.priority)}>
                  {topic.priority}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {topic.keywords.map((keyword, i) => (
                  <Badge key={i} variant="outline">{keyword}</Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{topic.avatar_name}</span>
                  {' • '}
                  <span>{topic.content_angle}</span>
                </div>
                <Button size="sm" variant="ghost">
                  Use This Topic
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
