import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { SchedulePostDialog } from "./SchedulePostDialog";
import { EditPostDialog } from "./EditPostDialog";
import { parseUTCDate } from "@/lib/utils";

interface PostSchedulerProps {
  onCreateWithAI?: () => void;
}

export const PostScheduler = ({ onCreateWithAI }: PostSchedulerProps) => {
  const { selectedClient } = useClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-posts', selectedClient?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('client_id', selectedClient?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClient?.id
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getPostsForDay = (day: Date) => {
    return posts.filter(post => {
      if (!post.scheduled_date) return false;
      return isSameDay(parseUTCDate(post.scheduled_date), day);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'scheduled': return 'bg-blue-500 text-white';
      case 'posted': return 'bg-green-500 text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setCurrentMonth(new Date())} variant="outline">
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {daysInMonth.map(day => {
          const dayPosts = getPostsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toString()}
              className={`min-h-32 ${isToday ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              <CardHeader className="p-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">
                  {format(day, 'd')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {dayPosts.length === 0 ? (
                  <div
                    className="flex items-center justify-center h-16 border-2 border-dashed rounded-md opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => {
                      setSelectedScheduleDate(day);
                      setScheduleDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  dayPosts.map(post => (
                    <div
                      key={post.id}
                      className="group relative rounded overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setEditingPost(post)}
                    >
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full h-16 object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Badge className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
        </Card>
      );
    })}
  </div>

  {/* Schedule Dialog */}
  <SchedulePostDialog
    open={scheduleDialogOpen}
    onOpenChange={setScheduleDialogOpen}
    selectedDate={selectedScheduleDate}
    onCreateWithAI={() => {
      setScheduleDialogOpen(false);
      onCreateWithAI?.();
    }}
  />

  {/* Edit Post Dialog */}
  {editingPost && (
    <EditPostDialog
      post={editingPost}
      open={!!editingPost}
      onOpenChange={(open) => !open && setEditingPost(null)}
    />
  )}

  {/* Legend */}
      <div className="flex items-center gap-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted" />
          <span className="text-sm">Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-sm">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-sm">Posted</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{posts.filter(p => p.status === 'draft').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{posts.filter(p => p.status === 'scheduled').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Posted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{posts.filter(p => p.status === 'posted').length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};