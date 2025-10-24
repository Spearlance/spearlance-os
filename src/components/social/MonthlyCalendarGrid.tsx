import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PostManagementDrawer } from "./PostManagementDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { toast } from "sonner";

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
}

export const MonthlyCalendarGrid = ({ 
  posts, 
  onRefresh, 
  selectedMonth, 
  selectedYear 
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
    const date = new Date(post.scheduled_date);
    const day = date.getDate();
    if (!acc[day]) acc[day] = [];
    acc[day].push(post);
    return acc;
  }, {} as Record<number, Post[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idea': return 'bg-muted text-muted-foreground';
      case 'ready': return 'bg-primary/20 text-primary';
      case 'scheduled': return 'bg-accent text-accent-foreground';
      case 'published': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleAddPost = (day: number) => {
    toast('Add post functionality coming soon');
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
    
    calendarDays.push(
      <div 
        key={day} 
        className="min-h-32 border border-border/50 p-2 bg-background hover:bg-accent/5 transition-colors"
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
              className={`p-2 cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(post.status)}`}
              onClick={() => setSelectedPost(post)}
            >
              <div className="text-xs font-medium truncate">
                {post.post_idea_json?.topic_title || 'Untitled'}
              </div>
              {post.post_idea_json?.category && (
                <Badge variant="outline" className="text-[10px] mt-1">
                  {post.post_idea_json.category.replace(/_/g, ' ')}
                </Badge>
              )}
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
