import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PostManagementDrawer } from "./PostManagementDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
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

interface MonthlyCalendarGridProps {
  posts: Post[];
  onRefresh: () => void;
  selectedMonth: number;
  selectedYear: number;
  activeStrategy?: any;
  onAddPost?: () => void;
}

export const MonthlyCalendarGrid = ({
  posts,
  onRefresh,
  selectedMonth,
  selectedYear,
  activeStrategy,
  onAddPost,
}: MonthlyCalendarGridProps) => {
  const { selectedClient } = useClient();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  const getDaysInMonth = (month: number, year: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    return { daysInMonth, firstDay };
  };

  const { daysInMonth, firstDay } = getDaysInMonth(selectedMonth, selectedYear);
  
  const postsByDate = posts.reduce((acc, post) => {
    const date = parseUTCDate(post.scheduled_date);
    const day = date.getDate();
    if (!acc[day]) acc[day] = [];
    acc[day].push(post);
    return acc;
  }, {} as Record<number, Post[]>);

  const getStatusColor = (post: Post) => {
    // Check Late status first
    if ((post as any).late_status === 'published') return 'bg-green-500/20 text-green-700 border-green-300';
    if ((post as any).late_status === 'scheduled') return 'bg-blue-500/20 text-blue-700 border-blue-300';
    if ((post as any).late_status === 'approved') return 'bg-purple-500/20 text-purple-700 border-purple-300';
    if ((post as any).late_status === 'pending_approval') return 'bg-yellow-500/20 text-yellow-700 border-yellow-300';
    if ((post as any).late_status === 'failed') return 'bg-red-500/20 text-red-700 border-red-300';
    
    // Check local readiness
    const hasCaption = !!post.caption_text;
    const hasImage = !!post.image_url;
    const hasPlatform = post.platform && post.platform.length > 0;
    
    if (hasCaption && hasImage && hasPlatform) {
      return 'bg-indigo-500/20 text-indigo-700 border-indigo-300'; // Draft
    }
    
    return 'bg-muted text-muted-foreground border-muted';
  };

  const getStatusIcon = (post: Post) => {
    if ((post as any).late_status === 'published') return '✓';
    if ((post as any).late_status === 'scheduled') return '⏰';
    if ((post as any).late_status === 'approved') return '✓';
    if ((post as any).late_status === 'pending_approval') return '⏳';
    if ((post as any).late_status === 'failed') return '✗';
    
    const hasCaption = !!post.caption_text;
    const hasImage = !!post.image_url;
    const hasPlatform = post.platform && post.platform.length > 0;
    
    if (hasCaption && hasImage && hasPlatform) return '📝';
    
    return '';
  };

  const isActiveDayOfWeek = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    return activeStrategy?.selected_days?.includes(isoDayOfWeek) ?? true;
  };

  const handleAddPost = (_day: number) => {
    onAddPost?.();
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = [];
  
  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-32 border border-border/50"></div>);
  }
  
  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPosts = postsByDate[day] || [];
    const isActive = isActiveDayOfWeek(day);
    
    calendarDays.push(
      <div 
        key={day} 
        className={`min-h-32 border border-border/50 p-2 transition-colors ${isActive ? 'bg-background hover:bg-accent/5' : 'bg-muted/30 opacity-50'}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-muted-foreground">{day}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleAddPost(day)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-1">
          {dayPosts.map((post) => (
            <Card
              key={post.id}
              className={`p-2 cursor-pointer hover:shadow-md transition-shadow border ${getStatusColor(post)}`}
              onClick={() => setSelectedPost(post)}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="text-xs font-medium truncate flex-1">
                  {post.post_idea_json?.topic_title || 'Untitled'}
                </div>
                {getStatusIcon(post) && (
                  <span className="text-sm">{getStatusIcon(post)}</span>
                )}
              </div>
            </Card>
          ))}
          
          {dayPosts.length === 0 && (
            <div className="flex items-center justify-center h-16 group">
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleAddPost(day)}
              >
                <Plus className="h-4 w-4" />
              </Button>
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

      <PostManagementDrawer
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        onRefresh={onRefresh}
      />
    </>
  );
};
