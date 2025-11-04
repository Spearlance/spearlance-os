import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BlogTopicDrawer } from "./BlogTopicDrawer";
import { toast } from "sonner";
import { parseUTCDate } from "@/lib/utils";

interface BlogTopic {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  suggested_publish_date: string;
  status: string;
  client_id: string;
  blog_posts: Array<{ id: string; status: string; title: string }>;
}

interface BlogCalendarGridProps {
  topics: BlogTopic[];
  onRefresh: () => void;
  selectedMonth: number;
  selectedYear: number;
  activeStrategy?: any;
}

export const BlogCalendarGrid = ({ 
  topics, 
  onRefresh, 
  selectedMonth, 
  selectedYear,
  activeStrategy
}: BlogCalendarGridProps) => {
  const [selectedTopic, setSelectedTopic] = useState<BlogTopic | null>(null);
  
  const getDaysInMonth = (month: number, year: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    return { daysInMonth, firstDay };
  };

  const { daysInMonth, firstDay } = getDaysInMonth(selectedMonth, selectedYear);
  
  const topicsByDate = topics.reduce((acc, topic) => {
    const date = parseUTCDate(topic.suggested_publish_date);
    const day = date.getDate();
    if (!acc[day]) acc[day] = [];
    acc[day].push(topic);
    return acc;
  }, {} as Record<number, BlogTopic[]>);

  const getStatusColor = (topic: BlogTopic) => {
    if (topic.blog_posts?.length > 0) {
      const post = topic.blog_posts[0];
      if (post.status === 'published') return 'bg-green-500/20 text-green-700 border-green-300';
      if (post.status === 'scheduled') return 'bg-blue-500/20 text-blue-700 border-blue-300';
      return 'bg-indigo-500/20 text-indigo-700 border-indigo-300'; // Draft
    }
    
    return 'bg-muted text-muted-foreground border-muted';
  };

  const getStatusIcon = (topic: BlogTopic) => {
    if (topic.blog_posts?.length > 0) {
      const post = topic.blog_posts[0];
      if (post.status === 'published') return '✓';
      if (post.status === 'scheduled') return '⏰';
      return '📝';
    }
    
    return '';
  };

  const isActiveDayOfWeek = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    return activeStrategy?.selected_days?.includes(isoDayOfWeek) ?? true;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = [];
  
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-32 border border-border/50"></div>);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTopics = topicsByDate[day] || [];
    const isActive = isActiveDayOfWeek(day);
    
    calendarDays.push(
      <div 
        key={day} 
        className={`min-h-32 border border-border/50 p-2 transition-colors ${isActive ? 'bg-background hover:bg-accent/5' : 'bg-muted/30 opacity-50'}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-muted-foreground">{day}</span>
        </div>
        
        <div className="space-y-1">
          {dayTopics.map((topic) => (
            <Card
              key={topic.id}
              className={`p-2 cursor-pointer hover:shadow-md transition-shadow border ${getStatusColor(topic)}`}
              onClick={() => setSelectedTopic(topic)}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="text-xs font-medium truncate flex-1">
                  {topic.title}
                </div>
                {getStatusIcon(topic) && (
                  <span className="text-sm">{getStatusIcon(topic)}</span>
                )}
              </div>
            </Card>
          ))}
          
          {dayTopics.length === 0 && (
            <div className="flex items-center justify-center h-16">
              <span className="text-xs text-muted-foreground">No topics</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-0 border border-border">
          {weekDays.map(day => (
            <div 
              key={day} 
              className="p-2 text-center font-semibold bg-muted text-foreground border-b border-border"
            >
              {day}
            </div>
          ))}
          {calendarDays}
        </div>
      </div>

      <BlogTopicDrawer
        topic={selectedTopic}
        open={!!selectedTopic}
        onOpenChange={(open) => !open && setSelectedTopic(null)}
        onRefresh={onRefresh}
      />
    </>
  );
};