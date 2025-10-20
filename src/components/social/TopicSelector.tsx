import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench, Eye, Lightbulb, Heart, Megaphone, Users, Building2, Sparkles, Camera } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AI_READY_TOPICS = [
  {
    id: 'tips',
    title: 'Tips & Advice',
    icon: Lightbulb,
    color: 'bg-green-500'
  },
  {
    id: 'promotion',
    title: 'Promotion',
    icon: Megaphone,
    color: 'bg-red-500'
  },
];

const PHOTO_NEEDED_TOPICS = [
  {
    id: 'show_work',
    title: 'Show Your Work',
    icon: Wrench,
    color: 'bg-blue-500'
  },
  {
    id: 'behind_scenes',
    title: 'Behind the Scenes',
    icon: Eye,
    color: 'bg-purple-500'
  },
  {
    id: 'happy_customer',
    title: 'Happy Customer',
    icon: Heart,
    color: 'bg-yellow-500',
    note: 'Coming soon: Auto-import from Google reviews'
  },
  {
    id: 'team',
    title: 'Team Spotlight',
    icon: Users,
    color: 'bg-cyan-500'
  },
  {
    id: 'community',
    title: 'Community',
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
      {/* Topic Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Your Post Topic</h3>
        
        {/* AI Ready Topics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Ready Topics</span>
            <Badge variant="secondary" className="text-xs">No photos needed</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {AI_READY_TOPICS.map((topic) => {
              const Icon = topic.icon;
              const isSelected = selectedTopic === topic.id;
              
              return (
                <button
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all min-w-[120px] w-[120px] ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${topic.color} flex items-center justify-center mb-2`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center">{topic.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo Needed Topics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Need Your Photos</span>
            <Badge variant="outline" className="text-xs">Upload content required</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {PHOTO_NEEDED_TOPICS.map((topic) => {
              const Icon = topic.icon;
              const isSelected = selectedTopic === topic.id;
              
              return (
                <button
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic.id)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all min-w-[120px] w-[120px] ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  {topic.note && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0.5 whitespace-nowrap"
                    >
                      Coming Soon
                    </Badge>
                  )}
                  <div className={`w-8 h-8 rounded-lg ${topic.color} flex items-center justify-center mb-2`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center">{topic.title}</span>
                </button>
              );
            })}
          </div>
        </div>
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