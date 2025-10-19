import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Image as ImageIcon, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PostManagementDrawer } from "./PostManagementDrawer";

interface Post {
  id: string;
  scheduled_date: string;
  post_idea_json: any;
  caption_text: string | null;
  image_url: string | null;
  platform: string[] | null;
  status: string;
}

interface MonthlyCalendarTableProps {
  posts: Post[];
  onRefresh: () => void;
}

export const MonthlyCalendarTable = ({ posts, onRefresh }: MonthlyCalendarTableProps) => {
  const { toast } = useToast();
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const readyCount = posts.filter(p => getPostStatus(p) === "ready").length;
  const progressPercent = Math.round((readyCount / posts.length) * 100);

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {format(new Date(posts[0]?.scheduled_date), 'MMMM yyyy')} Plan Progress
          </span>
          <span className="font-semibold">{readyCount}/{posts.length} posts ready ({progressPercent}%)</span>
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
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Captions</>
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
              <><ImageIcon className="h-4 w-4 mr-2" /> Generate Images</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedPosts([])}
          >
            Clear
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
            {posts.map((post) => {
              const idea = post.post_idea_json || {};
              const status = getPostStatus(post);

              return (
                <TableRow 
                  key={post.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedPost(post);
                    setDrawerOpen(true);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPosts.includes(post.id)}
                      onCheckedChange={() => togglePostSelection(post.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(post.scheduled_date), 'MMM d')}
                  </TableCell>
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
                    <div className="flex items-center justify-end gap-1">
                      {!post.caption_text && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateCaptions([post.id]);
                          }}
                          disabled={generatingCaptions || generatingImages}
                          title="Generate caption"
                        >
                          <Sparkles className="h-3 w-3" />
                        </Button>
                      )}
                      {!post.image_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateImages([post.id]);
                          }}
                          disabled={generatingCaptions || generatingImages}
                          title="Generate image"
                        >
                          <ImageIcon className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(post);
                          setDrawerOpen(true);
                        }}
                        title="View and edit details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
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
    </div>
  );
};