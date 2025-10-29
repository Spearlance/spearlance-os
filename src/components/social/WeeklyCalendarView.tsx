import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PostManagementDrawer } from "./PostManagementDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { toast } from "sonner";
import { parseUTCDate } from "@/lib/utils";

interface Post {
  id: string;
  scheduled_date: string;
  post_idea_json: any;
  platform: string[] | null;
  status: string;
  client_id: string;
  caption_text: string | null;
  image_url: string | null;
}

interface WeeklyCalendarViewProps {
  posts: Post[];
  onRefresh: () => void;
  selectedMonth: number;
  selectedYear: number;
}

export const WeeklyCalendarView = ({ 
  posts, 
  onRefresh, 
  selectedMonth, 
  selectedYear 
}: WeeklyCalendarViewProps) => {
  const { selectedClient } = useClient();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentWeek, setCurrentWeek] = useState(0);

  const getWeeksInMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    const weeks: Date[][] = [];
    let currentWeekDays: Date[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      currentWeekDays.push(date);
      
      if (date.getDay() === 6 || day === daysInMonth) {
        weeks.push([...currentWeekDays]);
        currentWeekDays = [];
      }
    }
    
    return weeks;
  };

  const weeks = getWeeksInMonth(selectedMonth, selectedYear);
  const currentWeekDays = weeks[currentWeek] || [];
  
  const postsByDate = posts.reduce((acc, post) => {
    const date = parseUTCDate(post.scheduled_date);
    const dateKey = date.toISOString().split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  const getStatusInfo = (post: Post) => {
    // Check Late status first
    if ((post as any).late_status === 'published') {
      return { label: '✓ Published', color: 'bg-green-500/20 text-green-700 border-green-300' };
    }
    if ((post as any).late_status === 'scheduled') {
      return { label: '⏰ Scheduled', color: 'bg-blue-500/20 text-blue-700 border-blue-300' };
    }
    if ((post as any).late_status === 'approved') {
      return { label: '✓ Approved', color: 'bg-purple-500/20 text-purple-700 border-purple-300' };
    }
    if ((post as any).late_status === 'pending_approval') {
      return { label: '⏳ Needs Approval', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-300' };
    }
    if ((post as any).late_status === 'failed') {
      return { label: '✗ Failed', color: 'bg-red-500/20 text-red-700 border-red-300' };
    }
    
    // Local readiness
    const hasCaption = !!post.caption_text;
    const hasImage = !!post.image_url;
    const hasPlatform = post.platform && post.platform.length > 0;
    
    if (hasCaption && hasImage && hasPlatform) {
      return { label: '📝 Draft', color: 'bg-indigo-500/20 text-indigo-700 border-indigo-300' };
    } else if (hasCaption || hasImage) {
      return { label: 'Partial', color: 'bg-gray-500/20 text-gray-700 border-gray-300' };
    } else {
      return { label: 'Idea', color: 'bg-muted text-muted-foreground border-muted' };
    }
  };

  const handleAddPost = (date: Date) => {
    toast('Add post functionality coming soon');
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
            const dayPosts = postsByDate[dateKey] || [];
            const dayName = weekDays[date.getDay()];
            const dayNumber = date.getDate();

            return (
              <div key={dateKey} className="space-y-2">
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">{dayName}</div>
                  <div className="text-2xl font-bold">{dayNumber}</div>
                </div>

                <Card className="p-3 min-h-48 space-y-2">
                  {dayPosts.map((post) => {
                    const statusInfo = getStatusInfo(post);
                    return (
                      <Card
                        key={post.id}
                        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${statusInfo.color}`}
                        onClick={() => setSelectedPost(post)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium line-clamp-2">
                              {post.post_idea_json?.topic_title || 'Untitled'}
                            </span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          <div className="flex gap-1 text-xs text-muted-foreground">
                            {post.caption_text && <span>✍️</span>}
                            {post.image_url && <span>🖼️</span>}
                          </div>
                        </div>
                      </Card>
                    );
                  })}

                  {dayPosts.length === 0 && (
                    <div className="flex items-center justify-center h-32">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddPost(date)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Post
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <PostManagementDrawer
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        onRefresh={onRefresh}
      />
    </>
  );
};
