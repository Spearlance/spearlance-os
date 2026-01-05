import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BlogTopicDrawer } from "./BlogTopicDrawer";
import { parseUTCDate } from "@/lib/utils";

interface BlogTopic {
  id: string;
  topic_title: string;
  summary: string | null;
  category: string | null;
  suggested_publish_date: string;
  status: string;
  client_id: string;
  blog_posts: any;
}

interface BlogWeeklyCalendarViewProps {
  topics: BlogTopic[];
  onRefresh: () => void;
  selectedMonth: number;
  selectedYear: number;
  activeStrategy?: any;
}

export const BlogWeeklyCalendarView = ({ 
  topics, 
  onRefresh, 
  selectedMonth, 
  selectedYear,
  activeStrategy
}: BlogWeeklyCalendarViewProps) => {
  const [selectedTopic, setSelectedTopic] = useState<BlogTopic | null>(null);
  const [currentWeek, setCurrentWeek] = useState(0);

  // Filter to only show strategy days
  const strategyDays = activeStrategy?.selected_days || [];
  
  const isStrategyDay = (date: Date) => {
    if (strategyDays.length === 0) return true;
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    return strategyDays.includes(isoDayOfWeek);
  };

  const getWeeksInMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    const weeks: Date[][] = [];
    let currentWeekDays: Date[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      // Only include strategy days
      if (isStrategyDay(date)) {
        currentWeekDays.push(date);
      }
      
      // End of week (Saturday) or end of month
      if (date.getDay() === 6 || day === daysInMonth) {
        if (currentWeekDays.length > 0) {
          weeks.push([...currentWeekDays]);
          currentWeekDays = [];
        }
      }
    }
    
    return weeks;
  };

  const weeks = getWeeksInMonth(selectedMonth, selectedYear);
  const currentWeekDays = weeks[currentWeek] || [];
  
  const topicsByDate = topics.reduce((acc, topic) => {
    const date = parseUTCDate(topic.suggested_publish_date);
    const dateKey = date.toISOString().split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(topic);
    return acc;
  }, {} as Record<string, BlogTopic[]>);

  const getStatusInfo = (topic: BlogTopic) => {
    if (topic.blog_posts) {
      const posts = Array.isArray(topic.blog_posts) ? topic.blog_posts : [topic.blog_posts];
      if (posts.length > 0 && posts[0]) {
        const post = posts[0];
        if (post.status === 'published') {
          return { label: '✓ Published', color: 'bg-green-500/20 text-green-700 border-green-300' };
        }
        if (post.status === 'scheduled') {
          return { label: '⏰ Scheduled', color: 'bg-blue-500/20 text-blue-700 border-blue-300' };
        }
        return { label: '📝 Draft', color: 'bg-indigo-500/20 text-indigo-700 border-indigo-300' };
      }
    }
    
    return { label: 'Idea', color: 'bg-muted text-muted-foreground border-muted' };
  };

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const startDate = currentWeekDays[0]?.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  const endDate = currentWeekDays[currentWeekDays.length - 1]?.toLocaleDateString('default', { month: 'short', day: 'numeric' });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Week of {startDate} - {endDate}, {selectedYear}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
              disabled={currentWeek === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(Math.min(weeks.length - 1, currentWeek + 1))}
              disabled={currentWeek === weeks.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {currentWeekDays.map((date) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayTopics = topicsByDate[dateKey] || [];
            const dayName = weekDays[date.getDay()];
            const dayNumber = date.getDate();

            return (
              <div key={dateKey} className="space-y-2">
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">{dayName}</div>
                  <div className="text-2xl font-bold">{dayNumber}</div>
                </div>

                <Card className="p-3 min-h-48 space-y-2">
                  {dayTopics.map((topic) => {
                    const statusInfo = getStatusInfo(topic);
                    return (
                      <Card
                        key={topic.id}
                        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${statusInfo.color}`}
                        onClick={() => setSelectedTopic(topic)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium line-clamp-2">
                              {topic.topic_title}
                            </span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          {topic.category && (
                            <div className="text-xs text-muted-foreground">
                              {topic.category}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}

                  {dayTopics.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                      No topics
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
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