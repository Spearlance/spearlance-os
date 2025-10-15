import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Sparkles, FileText, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SchedulePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onCreateWithAI: () => void;
}

type DialogMode = 'select' | 'drafts' | 'upload';

export const SchedulePostDialog = ({ open, onOpenChange, selectedDate, onCreateWithAI }: SchedulePostDialogProps) => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DialogMode>('select');
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('');

  // Fetch draft posts
  const { data: draftPosts = [], isLoading: loadingDrafts } = useQuery({
    queryKey: ['social-posts-drafts', selectedClient?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('client_id', selectedClient?.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: mode === 'drafts' && !!selectedClient?.id
  });

  // Schedule draft mutation
  const scheduleDraftMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('social_media_posts')
        .update({
          status: 'scheduled',
          scheduled_date: selectedDate?.toISOString()
        })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast({
        title: "✅ Post scheduled!",
        description: `Scheduled for ${selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't schedule post",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload and create mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadImage || !selectedClient?.id) throw new Error('Missing required data');

      // Upload image to storage
      const fileExt = uploadImage.name.split('.').pop();
      const fileName = `${selectedClient.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('client-assets')
        .upload(fileName, uploadImage);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-assets')
        .getPublicUrl(fileName);

      // Create post
      const { error: insertError } = await supabase
        .from('social_media_posts')
        .insert([{
          client_id: selectedClient.id,
          caption_text: uploadCaption,
          image_url: publicUrl,
          image_source: 'manual_upload',
          topic_category: 'manual',
          status: 'scheduled',
          scheduled_date: selectedDate?.toISOString()
        }]);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast({
        title: "✅ Post created!",
        description: `Scheduled for ${selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't create post",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleClose = () => {
    setMode('select');
    setUploadImage(null);
    setUploadCaption('');
    setUploadPreviewUrl('');
    onOpenChange(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadImage || !uploadCaption.trim()) {
      toast({
        title: "Missing information",
        description: "Please add both an image and caption",
        variant: "destructive"
      });
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Schedule Post for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
          </DialogTitle>
          <DialogDescription>
            Choose how you want to create your post
          </DialogDescription>
        </DialogHeader>

        {/* Selection Mode */}
        {mode === 'select' && (
          <div className="grid gap-4 py-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMode('drafts')}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Choose from Draft</CardTitle>
                    <CardDescription>Select an existing draft post to schedule</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMode('upload')}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileUp className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Upload</CardTitle>
                    <CardDescription>Upload an image and add a caption manually</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
              handleClose();
              onCreateWithAI();
            }}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Create with AI</CardTitle>
                    <CardDescription>Use the AI workflow to create a new post</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Drafts Mode */}
        {mode === 'drafts' && (
          <div className="space-y-4 py-4">
            <Button variant="ghost" onClick={() => setMode('select')} className="mb-2">
              ← Back
            </Button>

            {loadingDrafts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : draftPosts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No draft posts available. Create a new post first!
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {draftPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => scheduleDraftMutation.mutate(post.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt=""
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm line-clamp-2">{post.caption_text}</p>
                          {post.hashtags && post.hashtags.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {post.hashtags.slice(0, 3).join(' ')}
                            </p>
                          )}
                        </div>
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-4 py-4">
            <Button variant="ghost" onClick={() => setMode('select')} className="mb-2">
              ← Back
            </Button>

            <div className="space-y-4">
              <div>
                <Label htmlFor="image-upload">Image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1"
                />
                {uploadPreviewUrl && (
                  <img
                    src={uploadPreviewUrl}
                    alt="Preview"
                    className="mt-3 w-full max-h-64 object-cover rounded"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  placeholder="Write your caption here..."
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="mt-1 min-h-32"
                />
              </div>

              <Button
                onClick={handleUploadSubmit}
                disabled={uploadMutation.isPending}
                className="w-full"
                size="lg"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Post
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
