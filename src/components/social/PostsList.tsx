import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EditPostDialog } from "./EditPostDialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, MoreVertical, Search, Grid3x3, List } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function PostsList() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [schedulingPost, setSchedulingPost] = useState<any | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['social-posts', selectedClient?.id, statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('social_media_posts')
        .select('*')
        .eq('client_id', selectedClient!.id)
        .neq('status', 'idea')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.ilike('caption_text', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClient?.id,
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ postId, date }: { postId: string; date: Date }) => {
      const { error } = await supabase
        .from('social_media_posts')
        .update({
          scheduled_date: date.toISOString(),
          status: 'scheduled',
        })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast({
        title: "Post scheduled",
        description: "Your post has been scheduled successfully.",
      });
      setSchedulingPost(null);
      setScheduleDate(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Error scheduling post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (post: any) => {
      const { error } = await supabase
        .from('social_media_posts')
        .insert([{
          client_id: post.client_id,
          caption_text: post.caption_text + " (Copy)",
          image_url: post.image_url,
          hashtags: post.hashtags,
          status: 'draft',
          topic_category: post.topic_category || 'manual',
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast({
        title: "Post duplicated",
        description: "A copy has been created as a draft.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error duplicating post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      scheduled: "default",
      posted: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading posts...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Posts Display */}
      {!posts || posts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? "No posts match your filters"
              : "No posts yet. Go to Monthly Planner to generate content ideas, then add captions and images to see posts here."}
          </p>
        </Card>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          )}
        >
          {posts.map((post) => (
            <Card
              key={post.id}
              className={cn(
                "overflow-hidden",
                viewMode === "list" && "flex items-center gap-4 p-4"
              )}
            >
              {viewMode === "grid" ? (
                <div>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm line-clamp-2 flex-1">
                        {post.caption_text || "No caption"}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingPost(post)}>
                            Edit
                          </DropdownMenuItem>
                          {post.status === 'draft' && (
                            <DropdownMenuItem onClick={() => setSchedulingPost(post)}>
                              Schedule
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(post)}>
                            Duplicate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {getStatusBadge(post.status)}
                      {post.scheduled_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.scheduled_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>

                    {post.status === 'draft' && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => setSchedulingPost(post)}
                      >
                        Schedule This
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{post.caption_text || "No caption"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(post.status)}
                      {post.scheduled_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.scheduled_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingPost(post)}>
                        Edit
                      </DropdownMenuItem>
                      {post.status === 'draft' && (
                        <DropdownMenuItem onClick={() => setSchedulingPost(post)}>
                          Schedule
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(post)}>
                        Duplicate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingPost && (
        <EditPostDialog
          post={editingPost}
          open={!!editingPost}
          onOpenChange={(open) => !open && setEditingPost(null)}
        />
      )}

      {/* Schedule Dialog */}
      {schedulingPost && (
        <Popover
          open={!!schedulingPost}
          onOpenChange={(open) => !open && setSchedulingPost(null)}
        >
          <PopoverContent className="w-auto p-0" align="center">
            <div className="p-4 space-y-4">
              <h4 className="font-semibold">Schedule Post</h4>
              <Calendar
                mode="single"
                selected={scheduleDate}
                onSelect={setScheduleDate}
                initialFocus
                className="pointer-events-auto"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSchedulingPost(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (scheduleDate) {
                      scheduleMutation.mutate({
                        postId: schedulingPost.id,
                        date: scheduleDate,
                      });
                    }
                  }}
                  disabled={!scheduleDate || scheduleMutation.isPending}
                  className="flex-1"
                >
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
