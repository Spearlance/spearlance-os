import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PostManagementDrawer } from "./PostManagementDrawer";
import { useToast } from "@/hooks/use-toast";
import { Search, Grid3x3, List } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function PostsList() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

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
                    <p className="text-sm line-clamp-2">
                      {post.caption_text || "No caption"}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      {getStatusBadge(post.status)}
                      {post.scheduled_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.scheduled_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedPost(post)}
                    >
                      Details
                    </Button>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPost(post)}
                  >
                    Details
                  </Button>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Post Management Drawer */}
      <PostManagementDrawer
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['social-posts'] })}
      />
    </div>
  );
}
