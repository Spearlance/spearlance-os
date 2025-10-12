import { useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle2, Upload } from "lucide-react";

interface StoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  clientId: string;
  initialData?: {
    recording_url?: string;
    recording_asset_id?: string;
    completed: boolean;
  };
  onSuccess: (data: {
    recording_url?: string;
    recording_asset_id?: string;
    completed: boolean;
  }) => void;
}

const questionSections = [
  {
    id: "origin",
    title: "1. Origin Story & Background",
    description: "Share your founder's journey and emotional hook",
    questions: [
      "How did the business start?",
      "What problem were you trying to solve in the beginning?",
      "Was there a turning point or breakthrough that made you commit fully to this path?",
      "What was the hardest part of starting out, and how did you overcome it?",
      "What do you want people to feel when they hear your story?",
    ],
  },
  {
    id: "different",
    title: "2. What Makes You Different",
    description: "Extract proof, credibility, and uniqueness",
    questions: [
      "What do you do better or differently than competitors?",
      "What specific results or client outcomes prove that?",
      "What certifications, systems, or processes set you apart?",
      "How do your clients describe you when they refer others?",
      "What's one myth or misconception about your industry that you wish people understood?",
    ],
  },
  {
    id: "expertise",
    title: "3. Experience & Expertise",
    description: "Highlight authority, leadership, and lessons learned",
    questions: [
      "How long have you been doing this, and what changes have you seen over time?",
      "What's one major challenge you solved that improved how your business operates today?",
      "What's your proudest moment or biggest success story?",
      "How do you stay ahead of trends, technology, or competition?",
    ],
  },
  {
    id: "clients",
    title: "4. Understanding Your Clients",
    description: "Align empathy and clarify value proposition",
    questions: [
      "Who is your ideal client, and what problems keep them up at night?",
      "What do they usually try before coming to you?",
      "What do your best clients value most about working with you?",
      "What objections or fears do new clients usually have, and how do you handle them?",
    ],
  },
  {
    id: "market",
    title: "5. Market & Operations",
    description: "Define logistics, service area, and scalability",
    questions: [
      "Where do you operate or serve clients?",
      "Are there regional factors that affect your work (weather, regulations, demographics)?",
      "How is your business structured — team size, equipment, or unique capabilities?",
      "What are your biggest growth opportunities right now?",
    ],
  },
  {
    id: "values",
    title: "6. Values & Vision",
    description: "Capture mission, culture, and forward-looking story",
    questions: [
      "What core values drive every decision in your business?",
      "What's your long-term vision for the company?",
      "How do you want clients to describe your brand five years from now?",
      "What kind of impact do you hope your company has on your community or industry?",
    ],
  },
  {
    id: "personality",
    title: "7. Quick-Fire Personality Questions",
    description: "Gather light personal and brand voice data",
    questions: [
      "What's one thing people would be surprised to learn about your work?",
      'Finish this sentence: "When someone hires us, they\'re not just getting ____, they\'re getting ____."',
      "What's your favorite project or achievement so far?",
      "What's a mistake or failure that taught you something important?",
    ],
  },
  {
    id: "closing",
    title: "8. Closing Message",
    description: "Get the pitch in their own voice",
    questions: [
      "In 30 seconds or less, tell a potential client why they should choose your company.",
    ],
  },
];

export function StoryModal({ open, onOpenChange, submissionId, clientId, initialData, onSuccess }: StoryModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState(initialData?.recording_url || "");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.mp3', '.m4a', '.wav', '.mp4', '.mov'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      toast({
        title: "Invalid file type",
        description: "Please upload .mp3, .m4a, .wav, .mp4, or .mov files",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 25MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadSuccess(false);
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const assetId = crypto.randomUUID();
    const filePath = `${clientId}/${assetId}/story-recording.${fileExt}`;

    const { error } = await supabase.storage
      .from('client-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('client-assets')
      .getPublicUrl(filePath);

    // Create asset record
    const { data: { user } } = await supabase.auth.getUser();
    const { error: assetError } = await supabase
      .from("assets")
      .insert([{
        id: assetId,
        client_id: clientId,
        type: file.type.startsWith('video/') ? 'video' : 'other',
        title: `Discovery Story Recording - ${new Date().toLocaleDateString()}`,
        file_url: publicUrl,
        storage_type: 'upload',
        tags: ['Launch Pad Upload', 'Discovery Story'],
        created_by: user?.id,
      }]);

    if (assetError) throw assetError;

    return { assetId, publicUrl };
  };

  const handleSave = async () => {
    // Check if we have either a file or URL
    if (!selectedFile && !recordingUrl.trim()) {
      toast({
        title: "Recording required",
        description: "Please upload a file or provide a recording link",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format if provided
    if (recordingUrl.trim() && !recordingUrl.startsWith('https://')) {
      toast({
        title: "Invalid URL",
        description: "Recording URL must start with https://",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      let assetId = initialData?.recording_asset_id;
      let fileUrl = recordingUrl;

      // Handle file upload if provided
      if (selectedFile) {
        setUploadProgress(30);
        const result = await uploadFile(selectedFile);
        assetId = result.assetId;
        fileUrl = result.publicUrl;
        setUploadProgress(70);
      }

      const storyData = {
        recording_url: fileUrl || undefined,
        recording_asset_id: assetId || undefined,
        completed: true,
      };

      setUploadProgress(100);
      setUploadSuccess(true);

      toast({
        title: "Story uploaded successfully!",
        description: "Your story has been saved",
      });

      // Wait a moment to show success message
      setTimeout(() => {
        onSuccess(storyData);
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error("Error saving story:", error);
      toast({
        title: "Error",
        description: "Failed to save your story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tell Your Story</DialogTitle>
          <DialogDescription>
            Click <strong>Open Vocaroo</strong> or <strong>Open Loom</strong> to record your answers to the questions below.
            When finished, upload your file or paste your recording link before closing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-[#13cf48] text-[#13cf48] hover:bg-[#13cf48]/10 hover:text-[#13cf48]"
            onClick={() => window.open('https://vocaroo.com', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Vocaroo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-[#13cf48] text-[#13cf48] hover:bg-[#13cf48]/10 hover:text-[#13cf48]"
            onClick={() => window.open('https://loom.com', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Loom
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Accordion type="multiple" className="w-full">
            {questionSections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="hover:text-[#13cf48] hover:no-underline">
                  <div className="text-left">
                    <div className="font-semibold">{section.title}</div>
                    <div className="text-sm text-muted-foreground font-normal">{section.description}</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-muted-foreground">
                    {section.questions.map((question, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-[#13cf48] font-semibold">•</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="border-t pt-4 mt-4 space-y-4">
          <div>
            <Label className="font-semibold mb-2 block">Upload Your Recording (Required)</Label>
            <div className="border-2 border-dashed hover:border-[#13cf48] rounded-lg p-6 text-center transition-colors">
              <input
                type="file"
                accept=".mp3,.m4a,.wav,.mp4,.mov"
                onChange={handleFileSelect}
                className="hidden"
                id="story-file-upload"
              />
              <label htmlFor="story-file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  .mp3, .m4a, .wav, .mp4, .mov (max 25MB)
                </p>
              </label>
              {selectedFile && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="recording-url" className="text-sm">
              Or paste your Vocaroo/Loom link here:
            </Label>
            <Input
              id="recording-url"
              type="url"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              placeholder="https://vocaroo.com/..."
              className="mt-1 bg-background placeholder:text-muted-foreground"
            />
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div>
              <Label className="text-sm">Uploading...</Label>
              <Progress value={uploadProgress} className="mt-2" />
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2 p-3 bg-[#13cf48]/10 border border-[#13cf48] rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-[#13cf48]" />
              <span className="text-sm text-[#13cf48] font-medium">Story uploaded successfully!</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#13cf48] text-white hover:bg-[#13cf48]/90"
            >
              {loading ? "Saving..." : "Save and Close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
