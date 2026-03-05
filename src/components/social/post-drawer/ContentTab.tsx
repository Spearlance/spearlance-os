import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Send,
  Loader2,
  FolderOpen,
} from "lucide-react";

interface Post {
  id: string;
  scheduled_date: string;
  post_idea_json: any;
  caption_text: string | null;
  image_url: string | null;
  platform: string[] | null;
  status: string;
}

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

interface ContentTabProps {
  post: Post;
  caption: string;
  setCaption: (value: string) => void;
  scheduledDate: string;
  setScheduledDate: (value: string) => void;
  scheduledTime: string;
  setScheduledTime: (value: string) => void;
  selectedPlatforms: string[];
  connectedPlatforms: Set<string>;
  isSaving: boolean;
  isScheduling: boolean;
  isGeneratingCaption: boolean;
  isGeneratingImage: boolean;
  editingTopic: boolean;
  setEditingTopic: (value: boolean) => void;
  topicTitle: string;
  setTopicTitle: (value: string) => void;
  topicDescription: string;
  setTopicDescription: (value: string) => void;
  topicCategory: string;
  setTopicCategory: (value: string) => void;
  isGeneratingTopicIdeas: boolean;
  generatedTopicIdeas: any[];
  setGeneratedTopicIdeas: (value: any[]) => void;
  clientTimezone: string | undefined;
  onSave: () => void;
  onSaveTopic: () => void;
  onGenerateCaption: () => void;
  onGenerateImage: () => void;
  onGenerateTopicIdeas: () => void;
  onSelectGeneratedIdea: (idea: any) => void;
  onSchedule: () => void;
  onShowAssetDialog: () => void;
}

export const ContentTab = ({
  post,
  caption,
  setCaption,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  selectedPlatforms,
  connectedPlatforms,
  isSaving,
  isScheduling,
  isGeneratingCaption,
  isGeneratingImage,
  editingTopic,
  setEditingTopic,
  topicTitle,
  setTopicTitle,
  topicDescription,
  setTopicDescription,
  topicCategory,
  setTopicCategory,
  isGeneratingTopicIdeas,
  generatedTopicIdeas,
  setGeneratedTopicIdeas,
  clientTimezone,
  onSave,
  onSaveTopic,
  onGenerateCaption,
  onGenerateImage,
  onGenerateTopicIdeas,
  onSelectGeneratedIdea,
  onSchedule,
  onShowAssetDialog,
}: ContentTabProps) => {
  return (
    <div className="p-6 space-y-6">
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
                onClick={onSaveTopic}
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
                onClick={onGenerateTopicIdeas}
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
                    onClick={() => onSelectGeneratedIdea(idea)}
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
            onClick={onGenerateCaption}
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
              onClick={onGenerateImage}
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
            <Button
              size="sm"
              variant="outline"
              onClick={onShowAssetDialog}
            >
              <FolderOpen className="h-3 w-3 mr-2" />
              Choose from Assets
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
          Time zone: {clientTimezone || 'America/New_York'}
        </p>
      </div>

      <Button onClick={onSave} disabled={isSaving} className="w-full">
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
                    onClick={onSchedule}
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
    </div>
  );
};
