import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { AssetRecommendationDialog } from "./AssetRecommendationDialog";
import { ContentTab } from "./post-drawer/ContentTab";
import { AnalyticsTab } from "./post-drawer/AnalyticsTab";
import { CommentsTab } from "./post-drawer/CommentsTab";
import { ChannelsTab } from "./post-drawer/ChannelsTab";

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
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);
  const [analyticsLastSynced, setAnalyticsLastSynced] = useState<string | null>(null);

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

  // Fetch analytics for this post
  const { data: analytics = [], refetch: refetchAnalytics } = useQuery({
    queryKey: ['post-analytics', post?.id],
    queryFn: async () => {
      if (!post?.id) return [];
      const { data, error } = await supabase
        .from('social_post_analytics')
        .select('*')
        .eq('post_id', post.id)
        .order('synced_at', { ascending: false });
      
      if (error) throw error;
      
      // Set last synced time from most recent entry
      if (data && data.length > 0) {
        setAnalyticsLastSynced(data[0].synced_at);
      }
      
      return data;
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

  // Toggle platform
  const handlePlatformToggle = (platformId: string, checked: boolean) => {
    setSelectedPlatforms((prev) =>
      checked ? [...prev, platformId] : prev.filter((p) => p !== platformId)
    );
  };

  // Refresh analytics
  const handleRefreshAnalytics = async () => {
    if (!post?.id) return;
    
    // Check if post has been published via Late
    if (!(post as any).late_post_id) {
      toast({
        title: "Analytics Not Available",
        description: "This post hasn't been scheduled through Late yet.",
        variant: "default",
      });
      return;
    }

    // Check if post is published
    if ((post as any).late_status !== 'published') {
      toast({
        title: "Post Not Published",
        description: "Analytics are only available for published posts.",
        variant: "default",
      });
      return;
    }

    setIsRefreshingAnalytics(true);

    try {
      const { data, error } = await supabase.functions.invoke('late-sync-analytics', {
        body: {
          post_id: post.id,
        },
      });

      if (error) {
        // Handle specific Late API errors
        if (error.message?.includes('analytics_addon_required')) {
          toast({
            title: "Analytics Add-on Required",
            description: "The Late Analytics add-on is required to access post performance data. Please upgrade your Late plan.",
            variant: "default",
          });
          return;
        }
        
        if (error.message?.includes('429')) {
          toast({
            title: "Rate Limit Reached",
            description: "You've reached the analytics API rate limit (30 requests/hour). Please try again later.",
            variant: "default",
          });
          return;
        }
        
        throw error;
      }

      toast({
        title: "Analytics Updated",
        description: `Synced analytics for ${data.platforms?.length || 0} platform(s).`,
      });
      
      // Refetch analytics data
      refetchAnalytics();
      
    } catch (error: any) {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to sync analytics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingAnalytics(false);
    }
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
            <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
            <TabsTrigger value="channels" className="flex-1">Channels</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-200px)]">
            {/* Content Tab */}
            <TabsContent value="content">
              <ContentTab
                post={post}
                caption={caption}
                setCaption={setCaption}
                scheduledDate={scheduledDate}
                setScheduledDate={setScheduledDate}
                scheduledTime={scheduledTime}
                setScheduledTime={setScheduledTime}
                selectedPlatforms={selectedPlatforms}
                connectedPlatforms={connectedPlatforms}
                isSaving={isSaving}
                isScheduling={isScheduling}
                isGeneratingCaption={isGeneratingCaption}
                isGeneratingImage={isGeneratingImage}
                editingTopic={editingTopic}
                setEditingTopic={setEditingTopic}
                topicTitle={topicTitle}
                setTopicTitle={setTopicTitle}
                topicDescription={topicDescription}
                setTopicDescription={setTopicDescription}
                topicCategory={topicCategory}
                setTopicCategory={setTopicCategory}
                isGeneratingTopicIdeas={isGeneratingTopicIdeas}
                generatedTopicIdeas={generatedTopicIdeas}
                setGeneratedTopicIdeas={setGeneratedTopicIdeas}
                clientTimezone={selectedClient?.timezone}
                onSave={handleSave}
                onSaveTopic={handleSaveTopic}
                onGenerateCaption={handleGenerateCaption}
                onGenerateImage={handleGenerateImage}
                onGenerateTopicIdeas={handleGenerateTopicIdeas}
                onSelectGeneratedIdea={handleSelectGeneratedIdea}
                onSchedule={handleSchedule}
                onShowAssetDialog={() => setShowAssetDialog(true)}
              />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <AnalyticsTab
                post={post}
                analytics={analytics}
                analyticsLastSynced={analyticsLastSynced}
                isRefreshingAnalytics={isRefreshingAnalytics}
                onRefreshAnalytics={handleRefreshAnalytics}
              />
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments">
              <CommentsTab
                comments={comments}
                newComment={newComment}
                setNewComment={setNewComment}
                onAddComment={handleAddComment}
              />
            </TabsContent>

            {/* Channels Tab */}
            <TabsContent value="channels">
              <ChannelsTab
                selectedPlatforms={selectedPlatforms}
                connectedPlatforms={connectedPlatforms}
                isSaving={isSaving}
                onPlatformToggle={handlePlatformToggle}
                onSave={handleSave}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>

      <AssetRecommendationDialog
        open={showAssetDialog}
        onOpenChange={setShowAssetDialog}
        caption={caption}
        clientId={selectedClient?.id}
        onSelectAsset={async (imageUrl, source) => {
          if (!post) return;
          
          try {
            const { error } = await supabase
              .from('social_media_posts')
              .update({
                image_url: imageUrl,
                image_source: source,
              })
              .eq('id', post.id);

            if (error) throw error;

            toast({
              title: "Asset Applied",
              description: "Image updated from your brand assets.",
            });
            
            setShowAssetDialog(false);
            onRefresh();
          } catch (error: any) {
            toast({
              title: "Update Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        }}
      />
    </Sheet>
  );
};
