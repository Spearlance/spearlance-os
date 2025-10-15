import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wrench, Eye, Lightbulb, Heart, Megaphone, Users, Building2 } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TOPICS = [
  {
    id: 'show_work',
    title: 'Show Your Work',
    description: 'Share your process and expertise',
    icon: Wrench,
    color: 'bg-blue-500'
  },
  {
    id: 'behind_scenes',
    title: 'Behind the Scenes',
    description: 'Give a peek into your daily life',
    icon: Eye,
    color: 'bg-purple-500'
  },
  {
    id: 'tips',
    title: 'Tips & Advice',
    description: 'Share helpful industry knowledge',
    icon: Lightbulb,
    color: 'bg-green-500'
  },
  {
    id: 'happy_customer',
    title: 'Happy Customer',
    description: 'Celebrate testimonials and wins',
    icon: Heart,
    color: 'bg-yellow-500'
  },
  {
    id: 'promotion',
    title: 'Promotion',
    description: 'Announce sales and special offers',
    icon: Megaphone,
    color: 'bg-red-500'
  },
  {
    id: 'team',
    title: 'Team Spotlight',
    description: 'Introduce your amazing team',
    icon: Users,
    color: 'bg-cyan-500'
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Local events and partnerships',
    icon: Building2,
    color: 'bg-violet-500'
  },
];

interface TopicSelectorProps {
  onComplete: (topic: string, idea: any) => void;
}

export const TopicSelector = ({ onComplete }: TopicSelectorProps) => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<any[]>([]);

  const handleTopicSelect = async (topicId: string) => {
    setSelectedTopic(topicId);
    setIsGenerating(true);
    setIdeas([]);

    try {
      const { data, error } = await supabase.functions.invoke('social-generate-ideas', {
        body: {
          client_id: selectedClient?.id,
          topic_category: topicId,
        }
      });

      if (error) throw error;

      setIdeas(data.ideas || []);
    } catch (error: any) {
      console.error('Error generating ideas:', error);
      toast({
        title: "Couldn't generate ideas",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          const isSelected = selectedTopic === topic.id;
          
          return (
            <Card
              key={topic.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleTopicSelect(topic.id)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${topic.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
                <CardDescription>{topic.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Loading State */}
      {isGenerating && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Thinking up some great ideas for you...</p>
            <p className="text-sm text-muted-foreground">This usually takes 5-10 seconds</p>
          </CardContent>
        </Card>
      )}

      {/* Generated Ideas */}
      {!isGenerating && ideas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Post Ideas for You</h3>
          <div className="grid gap-4">
            {ideas.map((idea, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{idea.title}</CardTitle>
                  <CardDescription>{idea.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    💡 {idea.suggested_approach}
                  </p>
                  <Button onClick={() => onComplete(selectedTopic, idea)} size="lg" className="w-full">
                    Use This Idea
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};