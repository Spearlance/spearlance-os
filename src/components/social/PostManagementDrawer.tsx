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
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicCategory, setTopicCategory] = useState("");
  const [isGeneratingTopicIdeas, setIsGeneratingTopicIdeas] = useState(false);
  const [generatedTopicIdeas, setGeneratedTopicIdeas] = useState<any[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (post) {
      setCaption(post.caption_text || "");
      setScheduledDate(post.scheduled_date || "");
      
      // Extract time from scheduled_date
      if (post.scheduled_date) {
        const date = new Date(post.scheduled_date);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setScheduledTime(`${hours}:${minutes}`);
      }
      
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

  // Check if any selected platform requires approval
  useEffect(() => {
    const checkApprovalRequirement = async () => {
      if (!selectedClient?.id || selectedPlatforms.length === 0) {
        setRequiresApproval(false);
        return;
      }

      const { data: lateProfile } = await supabase
        .from('late_profiles')
        .select('id')
        .eq('client_id', selectedClient.id)
        .single();

      if (!lateProfile) return;

      const { data: accounts } = await supabase
        .from('late_social_accounts')
        .select('platform, requires_approval')
        .eq('late_profile_id', lateProfile.id)
        .eq('is_active', true)
        .in('platform', selectedPlatforms);

      const needsApproval = accounts?.some(a => a.requires_approval) || false;
      setRequiresApproval(needsApproval);
    };

    checkApprovalRequirement();
  }, [selectedPlatforms, selectedClient]);

  // Fetch connected social accounts
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      if (!selectedClient?.id) return;

      const { data: lateProfile } = await supabase
        .from('late_profiles')
        .select('id')
        .eq('client_id', selectedClient.id)
        .single();

      if (!lateProfile) return;

      const { data: accounts } = await supabase
        .from('late_social_accounts')
        .select('platform, is_active')
        .eq('late_profile_id', lateProfile.id)
        .eq('is_active', true);

      if (accounts) {
        const platforms = new Set(accounts.map(a => a.platform.toLowerCase()));
        setConnectedPlatforms(platforms);
      }
    };

    fetchConnectedAccounts();
  }, [selectedClient]);

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
      // Combine date and time into ISO string
      const [hours, minutes] = scheduledTime.split(':');
      const combinedDateTime = new Date(scheduledDate);
      combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const { error } = await supabase
        .from('social_media_posts')
        .update({
          caption_text: caption,
          scheduled_date: combinedDateTime.toISOString(),
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

  // Schedule post to social media
  const handleSchedule = async () => {
    if (!post || !selectedClient) return;
    setIsScheduling(true);

    try {
      // Combine date and time for scheduling
      const [hours, minutes] = scheduledTime.split(':');
      const scheduledFor = new Date(scheduledDate);
      scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Only schedule to connected platforms
      const connectedSelected = selectedPlatforms.filter(p => connectedPlatforms.has(p));
      
      if (connectedSelected.length === 0) {
        toast({
          title: "No Connected Platforms",
          description: "Please connect at least one platform or schedule manually.",
          variant: "default",
        });
        setIsScheduling(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('late-schedule-post', {
        body: {
          post_id: post.id,
          scheduled_for: scheduledFor.toISOString(),
          timezone: selectedClient.timezone || 'America/New_York',
          platforms: connectedSelected,
        },
      });

      if (error) throw error;

      const manualPlatforms = selectedPlatforms.filter(p => !connectedPlatforms.has(p));
      const message = manualPlatforms.length > 0
        ? `Scheduled to ${connectedSelected.join(', ')}! Don't forget to manually schedule on ${manualPlatforms.join(', ')}.`
        : `Your post will publish on ${format(scheduledFor, 'MMMM d, yyyy')} at ${scheduledTime}`;

      toast({
        title: "Post Scheduled!",
        description: message,
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule post.",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  // Get connection status for a platform
  const getConnectionStatus = (platformId: string): {
    label: string;
    variant: 'default' | 'secondary' | 'outline';
    isConnected: boolean;
    requiresManualScheduling: boolean;
  } => {
    const comingSoonPlatforms = ['linkedin', 'twitter', 'tiktok'];
    
    if (comingSoonPlatforms.includes(platformId)) {
      return {
        label: 'Manual Scheduling',
        variant: 'secondary',
        isConnected: false,
        requiresManualScheduling: true
      };
    }
    
    const isConnected = connectedPlatforms.has(platformId);
    
    return {
      label: isConnected ? 'Connected' : 'Manual Scheduling',
      variant: isConnected ? 'default' : 'outline',
      isConnected,
      requiresManualScheduling: !isConnected
    };
  };

  // Toggle platform
  const handlePlatformToggle = (platformId: string, checked: boolean) => {
    setSelectedPlatforms((prev) =>
      checked ? [...prev, platformId] : prev.filter((p) => p !== platformId)
    );
  };

  if (!post) return null;

  const idea = post.post_idea_json || {};

  const getStatusDisplay = () => {
    const hasCaption = !!post.caption_text;
    const hasImage = !!post.image_url;
    const hasPlatform = post.platform && post.platform.length > 0;
    const isReady = hasCaption && hasImage && hasPlatform;

    // Check Late status first
    if ((post as any).late_status === 'published') {
      return { label: 'Published', variant: 'default' as const };
    }
    if ((post as any).late_status === 'scheduled') {
      return { label: 'Scheduled', variant: 'secondary' as const };
    }
    if ((post as any).late_status === 'failed') {
      return { label: 'Failed', variant: 'destructive' as const };
    }
    if ((post as any).late_status === 'pending_approval') {
      return { label: 'Approval Needed', variant: 'outline' as const };
    }
    if ((post as any).late_status === 'approved') {
      return { label: 'Approved', variant: 'secondary' as const };
    }
    
    // Local status
    if (isReady) {
      return { label: 'Draft', variant: 'outline' as const };
    }
    
    return null;
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span>{idea.topic_title || 'Untitled Post'}</span>
              {statusDisplay && (
                <Badge variant={statusDisplay.variant}>
                  {statusDisplay.label}
                </Badge>
              )}
            </div>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              {format(new Date(post.scheduled_date), 'MMMM d, yyyy')} at {scheduledTime}
            </p>
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
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    const [hours, minutes] = scheduledTime.split(':');
                    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    setScheduledDate(newDate.toISOString());
                  }}
                  className="mt-2"
                />
              </div>

              {/* Time Picker */}
              <div className="space-y-1">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground">
                  Time zone: {selectedClient?.timezone || 'America/New_York'}
                </p>
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

              {/* Schedule Button - only show when post is ready and not yet scheduled */}
              {post.caption_text && post.image_url && selectedPlatforms.length > 0 && !(post as any).late_post_id && (
                <>
                  {(() => {
                    const connectedSelected = selectedPlatforms.filter(p => connectedPlatforms.has(p));
                    const manualSelected = selectedPlatforms.filter(p => !connectedPlatforms.has(p));
                    
                    return (
                      <>
                        {connectedSelected.length > 0 && (
                          <Button
                            onClick={handleSchedule}
                            disabled={isScheduling}
                            className="w-full"
                            variant="default"
                          >
                            {isScheduling ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Scheduling...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Schedule to {connectedSelected.join(', ')}
                              </>
                            )}
                          </Button>
                        )}
                        
                        {manualSelected.length > 0 && (
                          <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-300">
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              📝 Remember to manually schedule on: {manualSelected.join(', ')}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}

              {/* Show status if already scheduled */}
              {(post as any).late_post_id && (post as any).late_status && (
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {(post as any).late_status === 'scheduled' && '⏰ Post is scheduled to publish'}
                    {(post as any).late_status === 'pending_approval' && '⏳ Waiting for approval'}
                    {(post as any).late_status === 'approved' && '✓ Approved and will publish soon'}
                    {(post as any).late_status === 'published' && '✓ Post has been published'}
                    {(post as any).late_status === 'failed' && '✗ Publishing failed - please try again'}
                  </p>
                </div>
              )}
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
                  const connectionStatus = getConnectionStatus(platform.id);
                  
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
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Label className="cursor-pointer">
                                {platform.label}
                              </Label>
                              <Badge 
                                variant={connectionStatus.variant}
                                className={
                                  connectionStatus.isConnected
                                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-300'
                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300'
                                }
                              >
                                {connectionStatus.label}
                              </Badge>
                            </div>
                            {connectionStatus.requiresManualScheduling && (
                              <p className="text-xs text-muted-foreground">
                                You'll need to schedule this manually on {platform.label}
                              </p>
                            )}
                          </div>
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
