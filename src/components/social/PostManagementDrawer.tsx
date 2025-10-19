import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Calendar as CalendarIcon,
  Send,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Video,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Post {
  id: string;
  scheduled_date: string;
  post_idea_json: any;
  caption_text: string | null;
  image_url: string | null;
  platform: string[] | null;
  status: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: {
    name: string;
  };
}

interface PostManagementDrawerProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, limit: 2200 },
  { id: 'facebook', label: 'Facebook', icon: Facebook, limit: 63206 },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, limit: 3000 },
  { id: 'twitter', label: 'Twitter / X', icon: Twitter, limit: 280 },
  { id: 'tiktok', label: 'TikTok', icon: Video, limit: 2200 },
];

const POST_CATEGORIES = [
  { id: 'tips', label: 'Tips & Advice', icon: '💡' },
  { id: 'promotion', label: 'Promotion', icon: '📣' },
  { id: 'show_work', label: 'Show Your Work', icon: '🔧' },
  { id: 'behind_scenes', label: 'Behind the Scenes', icon: '👁️' },
  { id: 'happy_customer', label: 'Happy Customer', icon: '❤️' },
  { id: 'team', label: 'Team Spotlight', icon: '👥' },
  { id: 'community', label: 'Community', icon: '🏢' },
  { id: 'custom', label: 'Custom / Other', icon: '✏️' },
];

export const PostManagementDrawer = ({
  post,
  open,
  onOpenChange,
  onRefresh,
}: PostManagementDrawerProps) => {
  const { toast } = useToast();
  const { selectedClient } = useClient();
  const queryClient = useQueryClient();

  const [caption, setCaption] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicCategory, setTopicCategory] = useState("");
  const [isGeneratingTopicIdeas, setIsGeneratingTopicIdeas] = useState(false);
  const [generatedTopicIdeas, setGeneratedTopicIdeas] = useState<any[]>([]);

  useEffect(() => {
    if (post) {
      setCaption(post.caption_text || "");
      setScheduledDate(post.scheduled_date || "");
      setSelectedPlatforms(post.platform || []);
      
      // Initialize topic fields
      const idea = post.post_idea_json || {};
      setTopicTitle(idea.topic_title || "");
      setTopicDescription(idea.topic_description || "");
      setTopicCategory(idea.category || "custom");
      setEditingTopic(false);
      setGeneratedTopicIdeas([]);
    }
  }, [post]);

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', post?.id],
    queryFn: async () => {
      if (!post?.id) return [];
      const { data, error } = await supabase
        .from('social_post_comments')
        .select('*, profiles(name)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!post?.id,
  });

  // Save post updates
  const handleSave = async () => {
    if (!post) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('social_media_posts')
        .update({
          caption_text: caption,
          scheduled_date: scheduledDate,
          platform: selectedPlatforms,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Post Updated",
        description: "Your changes have been saved.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save topic updates
  const handleSaveTopic = async () => {
    if (!post) return;
    setIsSaving(true);

    try {
      const updatedIdea = {
        ...post.post_idea_json,
        topic_title: topicTitle,
        topic_description: topicDescription,
        category: topicCategory,
      };

      const { error } = await supabase
        .from('social_media_posts')
        .update({
          post_idea_json: updatedIdea,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Topic Updated",
        description: "Your topic changes have been saved.",
      });
      
      setEditingTopic(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate topic ideas with AI
  const handleGenerateTopicIdeas = async () => {
    if (!selectedClient || !topicCategory) return;
    setIsGeneratingTopicIdeas(true);

    try {
      const { data, error } = await supabase.functions.invoke('social-generate-ideas', {
        body: {
          client_id: selectedClient.id,
          topic_category: topicCategory,
        }
      });

      if (error) throw error;

      setGeneratedTopicIdeas(data.ideas || []);
      
      toast({
        title: "Ideas Generated!",
        description: `Generated ${data.ideas?.length || 0} topic ideas for you.`,
      });
    } catch (error: any) {
      console.error('Error generating topic ideas:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTopicIdeas(false);
    }
  };

  const handleSelectGeneratedIdea = async (idea: any) => {
    if (!post) return;
    
    setTopicTitle(idea.title);
    setTopicDescription(idea.description);
    setGeneratedTopicIdeas([]);
    setIsSaving(true);

    try {
      const updatedIdea = {
        ...post.post_idea_json,
        topic_title: idea.title,
        topic_description: idea.description,
        category: topicCategory,
      };

      const { error } = await supabase
        .from('social_media_posts')
        .update({
          post_idea_json: updatedIdea,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Topic Updated",
        description: idea.title,
      });
      
      setEditingTopic(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate caption
  const handleGenerateCaption = async () => {
    if (!post || !selectedClient) return;
    setIsGeneratingCaption(true);

    try {
      const { data, error } = await supabase.functions.invoke('social-bulk-generate-captions', {
        body: {
          post_ids: [post.id],
          client_id: selectedClient.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Caption Generated!",
        description: "AI has created a new caption for this post.",
      });

      // Refetch the post data
      const { data: updatedPost } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('id', post.id)
        .single();

      if (updatedPost) {
        setCaption(updatedPost.caption_text || "");
      }
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Generate image
  const handleGenerateImage = async () => {
    if (!post || !selectedClient) return;
    setIsGeneratingImage(true);

    try {
      const { data, error } = await supabase.functions.invoke('social-bulk-generate-images', {
        body: {
          post_ids: [post.id],
          client_id: selectedClient.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Image Generated!",
        description: "AI has created a new image for this post.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!post || !newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('social_post_comments')
        .insert({
          post_id: post.id,
          comment_text: newComment,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Comment Added",
        description: "Your comment has been posted.",
      });
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ['post-comments', post.id] });
    } catch (error: any) {
      toast({
        title: "Comment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Toggle platform
  const handlePlatformToggle = (platformId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlatforms(prev => [...prev, platformId]);
    } else {
      setSelectedPlatforms(prev => prev.filter(p => p !== platformId));
    }
  };

  if (!post) return null;

  const idea = post.post_idea_json || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {idea.topic_title || 'Untitled Post'}
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {format(new Date(post.scheduled_date), 'MMMM d, yyyy')}
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="content" className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
            <TabsTrigger value="channels" className="flex-1">Channels</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-200px)]">
            {/* Content Tab */}
            <TabsContent value="content" className="p-6 space-y-6">
              {/* Topic Section - Editable */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Topic</Label>
                  {!editingTopic ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTopic(true)}
                    >
                      <Sparkles className="h-3 w-3 mr-2" />
                      Edit Topic
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTopic(false);
                          // Reset to original values
                          const idea = post.post_idea_json || {};
                          setTopicTitle(idea.topic_title || "");
                          setTopicDescription(idea.topic_description || "");
                          setTopicCategory(idea.category || "custom");
                          setGeneratedTopicIdeas([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveTopic}
                        disabled={isSaving || !topicTitle.trim()}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Topic'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {!editingTopic ? (
                  // Read-only view
                  <Card className="p-4 bg-muted/50">
                    <p className="font-medium">{topicTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {topicDescription}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {POST_CATEGORIES.find(c => c.id === topicCategory)?.icon}{' '}
                      {POST_CATEGORIES.find(c => c.id === topicCategory)?.label || topicCategory}
                    </Badge>
                  </Card>
                ) : (
                  // Edit mode
                  <div className="space-y-4">
                    {/* Category Selector */}
                    <div>
                      <Label className="text-sm mb-2 block">Category</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {POST_CATEGORIES.map((cat) => (
                          <Button
                            key={cat.id}
                            type="button"
                            variant={topicCategory === cat.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTopicCategory(cat.id)}
                            className="justify-start"
                          >
                            <span className="mr-2">{cat.icon}</span>
                            {cat.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* AI Topic Generation */}
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateTopicIdeas}
                        disabled={isGeneratingTopicIdeas || !topicCategory}
                        className="w-full"
                      >
                        {isGeneratingTopicIdeas ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Generating Ideas...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-2" />
                            Generate AI Topic Ideas
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Generated Ideas List */}
                    {generatedTopicIdeas.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <Label className="text-sm">Select a generated idea:</Label>
                        {generatedTopicIdeas.map((idea, index) => (
                          <Card 
                            key={index} 
                            className="p-3 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleSelectGeneratedIdea(idea)}
                          >
                            <p className="font-medium text-sm">{idea.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {idea.description}
                            </p>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Manual Topic Fields */}
                    <div>
                      <Label htmlFor="topic-title">Topic Title</Label>
                      <Input
                        id="topic-title"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        placeholder="Enter topic title..."
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="topic-description">Topic Description</Label>
                      <Textarea
                        id="topic-description"
                        value={topicDescription}
                        onChange={(e) => setTopicDescription(e.target.value)}
                        placeholder="Describe what this post is about..."
                        rows={3}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Caption Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Caption</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateCaption}
                    disabled={isGeneratingCaption}
                  >
                    {isGeneratingCaption ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write your caption or generate one with AI..."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {caption.length} characters
                </p>
              </div>

              {/* Image */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Image</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-3 w-3 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Upload className="h-3 w-3 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full rounded-lg border"
                  />
                ) : (
                  <Card className="p-12 text-center border-dashed">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      No image yet
                    </p>
                  </Card>
                )}
              </div>

              {/* Scheduled Date */}
              <div>
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={scheduledDate.split('T')[0]}
                  onChange={(e) => setScheduledDate(e.target.value + 'T12:00:00Z')}
                  className="mt-2"
                />
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="p-6 space-y-4">
              {/* Add Comment */}
              <div className="space-y-2">
                <Label>Add Comment</Label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a comment for your team..."
                  rows={3}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </Button>
              </div>

              <Separator />

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No comments yet. Start the conversation!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <Card key={comment.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">{comment.profiles.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <p className="text-sm">{comment.comment_text}</p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Channels Tab */}
            <TabsContent value="channels" className="p-6 space-y-4">
              <div>
                <Label className="text-base">Select Social Platforms</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose where this post will be published
                </p>
              </div>

              <div className="space-y-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const PlatformIcon = platform.icon;
                  return (
                    <Card key={platform.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedPlatforms.includes(platform.id)}
                            onCheckedChange={(checked) => 
                              handlePlatformToggle(platform.id, checked as boolean)
                            }
                          />
                          <PlatformIcon className="h-5 w-5" />
                          <Label className="cursor-pointer">{platform.label}</Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {platform.limit} chars max
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {selectedPlatforms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select at least one platform to publish this post
                </p>
              )}

              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Platform Selection'
                )}
              </Button>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
