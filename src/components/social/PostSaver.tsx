import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, CheckCircle, ChevronLeft } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface PostSaverProps {
  postData: any;
  onBack: () => void;
}

export const PostSaver = ({ postData, onBack }: PostSaverProps) => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();

  const savePost = async (status: 'draft' | 'scheduled' | 'posted') => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('social_media_posts').insert([{
        client_id: selectedClient?.id,
        topic_category: postData.topic_category,
        caption_text: postData.caption_text,
        caption_tone: postData.caption_tone,
        hashtags: postData.hashtags,
        image_url: postData.image_url,
        image_source: postData.image_source,
        nano_banana_prompt: postData.nano_banana_prompt,
        status,
        scheduled_date: status === 'scheduled' ? scheduledDate?.toISOString() : null,
        posted_at: status === 'posted' ? new Date().toISOString() : null,
      }]);

      if (error) throw error;

      toast({
        title: "✅ Post saved!",
        description: `Your post has been ${status === 'draft' ? 'saved as a draft' : status === 'scheduled' ? 'scheduled' : 'marked as posted'}`,
      });

      // Reset form or navigate
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast({
        title: "Couldn't save post",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSchedule = () => {
    if (!scheduledDate) {
      toast({
        title: "Pick a date",
        description: "Please select when you want to post this",
        variant: "destructive"
      });
      return;
    }
    savePost('scheduled');
    setShowScheduler(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Your Post Preview</h3>
        <p className="text-muted-foreground">
          Here's how your post will look
        </p>
      </div>

      {/* Post Preview */}
      <Card className="max-w-lg mx-auto overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60" />
            <div>
              <CardTitle className="text-base">{selectedClient?.name}</CardTitle>
              <p className="text-xs text-muted-foreground">Just now</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          {/* Image */}
          {postData.image_url && (
            <img
              src={postData.image_url}
              alt="Post preview"
              className="w-full aspect-square object-cover"
            />
          )}

          {/* Caption */}
          <div className="px-6">
            <p className="text-sm whitespace-pre-wrap">{postData.caption_text}</p>
            {postData.hashtags && postData.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {postData.hashtags.map((tag: string, i: number) => (
                  <span key={i} className="text-sm text-primary">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="px-6 pb-6 flex gap-4 text-sm text-muted-foreground">
            <span>❤️ 0 likes</span>
            <span>💬 0 comments</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid gap-3 max-w-lg mx-auto">
        <Button
          onClick={() => savePost('draft')}
          variant="outline"
          size="lg"
          disabled={isSaving}
        >
          <Save className="h-5 w-5 mr-2" />
          Save as Draft
        </Button>

        <Button
          onClick={() => setShowScheduler(true)}
          size="lg"
          disabled={isSaving}
        >
          <Calendar className="h-5 w-5 mr-2" />
          Schedule Post
        </Button>

        <Button
          onClick={() => savePost('posted')}
          variant="secondary"
          size="lg"
          disabled={isSaving}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Mark as Posted
        </Button>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Your Post</DialogTitle>
            <DialogDescription>
              Pick when you want to publish this post
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={scheduledDate}
              onSelect={setScheduledDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>
          <Button onClick={handleSchedule} size="lg" disabled={!scheduledDate}>
            Schedule for {scheduledDate?.toLocaleDateString()}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Back Button */}
      <div className="flex justify-center">
        <Button onClick={onBack} variant="ghost" size="lg">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Edit
        </Button>
      </div>
    </div>
  );
};