import { useState, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Upload } from "lucide-react";

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
  const [pastedTranscript, setPastedTranscript] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

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
    // Validation: need either file or transcript
    if (!selectedFile && !pastedTranscript.trim()) {
      toast({
        title: "Recording Required",
        description: "Please upload a file or paste a transcript",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      let transcript = pastedTranscript.trim();
      let assetId = undefined;
      let fileUrl = undefined;

      // Path A: File upload - need to upload and transcribe
      if (selectedFile) {
        setProcessingStatus("Uploading your recording...");
        setUploadProgress(20);
        const result = await uploadFile(selectedFile);
        assetId = result.assetId;
        fileUrl = result.publicUrl;
        setUploadProgress(40);

        // Transcribe using Whisper
        setTranscribing(true);
        setProcessingStatus("Transcribing your recording...");
        setUploadProgress(50);

        const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-story', {
          body: { audioUrl: fileUrl }
        });

        if (transcribeError || !transcribeData?.success) {
          throw new Error(transcribeData?.error || 'Transcription failed');
        }

        transcript = transcribeData.transcript;
        console.log('Transcription complete, length:', transcript?.length);
        setTranscribing(false);
        setUploadProgress(70);
      } else {
        // Path B: Pasted transcript - skip straight to analysis
        setProcessingStatus("Processing your transcript...");
        setUploadProgress(50);
      }

      // Summarize the transcript
      setSummarizing(true);
      setProcessingStatus("Analyzing your story...");

      const { data: summarizeData, error: summarizeError } = await supabase.functions.invoke('summarize-story', {
        body: { transcript }
      });

      if (summarizeError || !summarizeData?.success) {
        throw new Error(summarizeData?.error || 'Story analysis failed');
      }

      const summary = summarizeData.summary;
      console.log('Summary complete');
      setSummarizing(false);
      setUploadProgress(90);

      // Update the launchpad submission with transcript and summary
      setProcessingStatus("Saving your story...");
      const { data: submissionData } = await supabase
        .from('launchpad_submissions')
        .select('responses_json')
        .eq('id', submissionId)
        .single();

      const currentResponses = submissionData?.responses_json as any || {};
      const currentDiscovery = currentResponses.discovery || {};
      
      const updatedResponses = {
        ...currentResponses,
        discovery: {
          ...currentDiscovery,
          story: {
            recording_url: fileUrl || undefined,
            recording_asset_id: assetId || undefined,
            completed: true,
            transcript,
            summary,
          }
        }
      };

      await supabase
        .from('launchpad_submissions')
        .update({ 
          responses_json: updatedResponses,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      const storyData = {
        recording_url: fileUrl || undefined,
        recording_asset_id: assetId || undefined,
        completed: true,
      };

      setUploadProgress(100);
      setUploadSuccess(true);
      setProcessingStatus("");

      toast({
        title: "Success!",
        description: selectedFile 
          ? "Your recording has been transcribed and analyzed successfully."
          : "Your transcript has been analyzed and optimized successfully.",
      });

      // Wait a moment to show success message
      setTimeout(() => {
        onSuccess(storyData);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error("Error saving story:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your story. Please try again.",
        variant: "destructive",
      });
      setTranscribing(false);
      setSummarizing(false);
      setProcessingStatus("");
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
            Upload your recording file or paste your transcript below. We'll automatically optimize it for AI analysis.
          </DialogDescription>
        </DialogHeader>

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
            <Label className="font-semibold mb-2 block">Upload Your Recording</Label>
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

          <div className="border-t pt-4">
            <Label htmlFor="transcript-paste" className="font-semibold mb-2 block">
              Or Paste Your Transcript
            </Label>
            <Textarea
              id="transcript-paste"
              value={pastedTranscript}
              onChange={(e) => setPastedTranscript(e.target.value)}
              placeholder="Paste your transcript here from Loom, Otter.ai, or any transcription tool..."
              className="min-h-[200px] bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Already have a transcript? Paste it here and we'll optimize it for marketing insights.
            </p>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div>
              <Label className="text-sm">{processingStatus || "Processing..."}</Label>
              <Progress value={uploadProgress} className="mt-2" />
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {transcribing && <p>⏳ Transcribing your recording...</p>}
                {summarizing && <p>🔍 Analyzing your story for marketing insights...</p>}
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2 p-3 bg-[#13cf48]/10 border border-[#13cf48] rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-[#13cf48]" />
              <span className="text-sm text-[#13cf48] font-medium">Story transcribed and analyzed! ✓</span>
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
