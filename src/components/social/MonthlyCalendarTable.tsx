import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PostManagementDrawer } from "./PostManagementDrawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  scheduled_date: string;
  post_idea_json: any;
  caption_text: string | null;
  image_url: string | null;
  platform: string[] | null;
  status: string;
  client_id: string;
}

interface MonthlyCalendarTableProps {
  posts: Post[];
  onRefresh: () => void;
  selectedMonth: number;
  selectedYear: number;
}

export const MonthlyCalendarTable = ({ posts, onRefresh, selectedMonth, selectedYear }: MonthlyCalendarTableProps) => {
  const { toast } = useToast();
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Sync selectedPost with posts array when data refreshes
  useEffect(() => {
    if (selectedPost && posts.length > 0) {
      const updatedPost = posts.find(p => p.id === selectedPost.id);
      if (updatedPost) {
        setSelectedPost(updatedPost);
      }
    }
  }, [posts]);

  // Generate all days for the selected month
  const getDaysInMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days: Date[] = [];
    
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  const allDays = getDaysInMonth(selectedMonth, selectedYear);

  // Group posts by their scheduled date (YYYY-MM-DD format)
  const postsByDate = posts.reduce((acc, post) => {
    const dateKey = format(new Date(post.scheduled_date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map(p => p.id));
    }
  };

  const handleGenerateCaptions = async (postIds: string[]) => {
    if (postIds.length === 0) return;

    setGeneratingCaptions(true);
    setProgress(`Generating captions for ${postIds.length} posts...`);

    try {
      const clientId = posts[0]?.post_idea_json?.client_id;
      
      const { data, error } = await supabase.functions.invoke('social-bulk-generate-captions', {
        body: {
          post_ids: postIds,
          client_id: clientId,
        },
      });

      if (error) throw error;

      toast({
        title: "Captions Generated!",
        description: `Successfully generated ${data.successful} of ${data.total} captions.`,
      });

      setSelectedPosts([]);
      onRefresh();
    } catch (error: any) {
      console.error('Error generating captions:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate captions.",
        variant: "destructive",
      });
    } finally {
      setGeneratingCaptions(false);
      setProgress("");
    }
  };

  const handleGenerateImages = async (postIds: string[]) => {
    if (postIds.length === 0) return;

    setGeneratingImages(true);
    setProgress(`Generating images for ${postIds.length} posts...`);

    try {
      const clientId = posts[0]?.post_idea_json?.client_id;
      
      const { data, error } = await supabase.functions.invoke('social-bulk-generate-images', {
        body: {
          post_ids: postIds,
          client_id: clientId,
        },
      });

      if (error) throw error;

      toast({
        title: "Images Generated!",
        description: `Successfully generated ${data.successful} of ${data.total} images.`,
      });

      setSelectedPosts([]);
      onRefresh();
    } catch (error: any) {
      console.error('Error generating images:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate images.",
        variant: "destructive",
      });
    } finally {
      setGeneratingImages(false);
      setProgress("");
    }
  };

  const handleAddPost = async (date: Date) => {
    try {
      const clientId = posts[0]?.client_id;
      if (!clientId) {
        toast({
          title: "Error",
          description: "Client ID not found. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      // Create a blank post for this date
      const { data: newPost, error } = await supabase
        .from('social_media_posts')
        .insert([{
          client_id: clientId,
          scheduled_date: date.toISOString(),
          status: 'idea',
          topic_category: 'custom',
          post_idea_json: {
            topic_title: 'New Post',
            topic_description: 'Click to edit this post',
            category: 'custom',
          },
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Post Created",
        description: `New post created for ${format(date, 'MMMM d, yyyy')}`,
      });

      onRefresh();
      
      // Open the drawer for the new post
      if (newPost) {
        setSelectedPost(newPost as Post);
        setDrawerOpen(true);
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create post.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingPostId(postId);
  };

  const confirmDelete = async () => {
    if (!deletingPostId) return;
    
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', deletingPostId);

      if (error) throw error;

      toast({
        title: "Post Deleted",
        description: "The post has been removed.",
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (deleteConfirmationText !== "DELETE") {
      toast({
        title: "Invalid Confirmation",
        description: "Please type DELETE to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .in('id', selectedPosts);

      if (error) throw error;

      toast({
        title: "Posts Deleted",
        description: `Successfully deleted ${selectedPosts.length} posts.`,
      });

      setSelectedPosts([]);
      setShowBulkDeleteDialog(false);
      setDeleteConfirmationText("");
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPostStatus = (post: Post) => {
    const hasCaption = !!post.caption_text;
    const hasImage = !!post.image_url;
    const hasPlatform = post.platform && post.platform.length > 0;
    
    if (hasCaption && hasImage && hasPlatform) return "ready";
    if (hasCaption && hasImage && !hasPlatform) return "needs-platform";
    if (hasCaption || hasImage) return "partial";
    return "idea";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "needs-platform": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "partial": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ready": return "✓ Ready";
      case "needs-platform": return "Need Platforms";
      case "partial": return "In Progress";
      default: return "Idea Only";
    }
  };

  // Count how many days have at least one "ready" post
  const daysWithReadyPosts = Object.keys(postsByDate).filter(dateKey => {
    const dayPosts = postsByDate[dateKey];
    return dayPosts.some(p => getPostStatus(p) === "ready");
  }).length;

  const totalDays = allDays.length;
  const progressPercent = totalDays > 0 ? Math.round((daysWithReadyPosts / totalDays) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')} Plan Progress
          </span>
          <span className="font-semibold">
            {daysWithReadyPosts}/{totalDays} days with ready posts ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPosts.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-secondary/50 rounded-lg">
          <span className="text-sm font-medium">{selectedPosts.length} selected</span>
          <Button
            size="sm"
            onClick={() => handleGenerateCaptions(selectedPosts)}
            disabled={generatingCaptions || generatingImages}
          >
            {generatingCaptions ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <>Generate Captions</>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleGenerateImages(selectedPosts)}
            disabled={generatingCaptions || generatingImages}
          >
            {generatingImages ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <>Generate Images</>
            )}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowBulkDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedPosts.length})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedPosts([])}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {progress && (
        <div className="text-sm text-center text-muted-foreground animate-pulse">
          {progress}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPosts.length === posts.length && posts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Caption</TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayPosts = postsByDate[dateKey] || [];
              const hasPosts = dayPosts.length > 0;

              // If no posts for this day, show "No Posts" row
              if (!hasPosts) {
                return (
                  <TableRow key={dateKey} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox disabled className="opacity-50" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{format(day, 'MMM d')}</div>
                        <div className="text-xs text-muted-foreground">{format(day, 'EEEE')}</div>
                      </div>
                    </TableCell>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No posts scheduled
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddPost(day)}
                        title="Add post for this day"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Post
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }

              // If there are posts for this day, show each one
              return dayPosts.map((post, index) => {
                const idea = post.post_idea_json || {};
                const status = getPostStatus(post);
                const isFirstPostOfDay = index === 0;
                const isLastPostOfDay = index === dayPosts.length - 1;

                return (
                  <>
                    <TableRow 
                      key={post.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedPost(post);
                        setDrawerOpen(true);
                      }}
                    >
                      {/* Show checkbox only on first post of the day */}
                      {isFirstPostOfDay && (
                        <TableCell 
                          rowSpan={dayPosts.length}
                          className="align-top pt-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={dayPosts.every(p => selectedPosts.includes(p.id))}
                            onCheckedChange={() => {
                              const allSelected = dayPosts.every(p => selectedPosts.includes(p.id));
                              if (allSelected) {
                                setSelectedPosts(prev => prev.filter(id => !dayPosts.find(p => p.id === id)));
                              } else {
                                setSelectedPosts(prev => [...prev, ...dayPosts.map(p => p.id).filter(id => !prev.includes(id))]);
                              }
                            }}
                          />
                        </TableCell>
                      )}
                      
                      {/* Show date only on first post of the day */}
                      {isFirstPostOfDay && (
                        <TableCell 
                          rowSpan={dayPosts.length}
                          className="font-medium align-top pt-4"
                        >
                          <div>
                            <div className="font-semibold">{format(day, 'MMM d')}</div>
                            <div className="text-xs text-muted-foreground">{format(day, 'EEEE')}</div>
                            {dayPosts.length > 1 && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {dayPosts.length} posts
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Rest of the columns (same as before) */}
                      <TableCell>
                        <div>
                          <div className="font-medium">{idea.topic_title || 'Untitled'}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {idea.topic_description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {idea.category?.replace(/_/g, ' ') || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.caption_text ? (
                          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                            ✓ Has Caption
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No caption
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {post.image_url ? (
                          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                            ✓ Has Image
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No image
                          </Badge>
                        )}
                      </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePost(post.id);
                  }}
                  title="Delete post"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
                    </TableRow>
                    {/* Add "Add Another Post" button after last post of the day */}
                    {isLastPostOfDay && (
                      <TableRow key={`${dateKey}-add`} className="border-t-2 border-dashed hover:bg-muted/20">
                        <TableCell colSpan={7} className="text-center py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddPost(day)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add another post for {format(day, 'MMM d')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              });
            })}
          </TableBody>
        </Table>
      </div>

      <PostManagementDrawer
        post={selectedPost}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRefresh={onRefresh}
      />

      <AlertDialog open={deletingPostId !== null} onOpenChange={(open) => !open && setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this post. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={(open) => {
        setShowBulkDeleteDialog(open);
        if (!open) setDeleteConfirmationText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPosts.length} Posts?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently delete {selectedPosts.length} selected posts. This action cannot be undone.</p>
              <p className="font-semibold">Type <span className="text-destructive">DELETE</span> to confirm:</p>
              <Input
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE"
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmationText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={deleteConfirmationText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Delete {selectedPosts.length} Posts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};