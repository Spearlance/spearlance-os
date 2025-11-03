import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles } from "lucide-react";

interface GenerateAvatarWithAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: {
    avatarName?: string;
    userPrompt?: string;
    generateSummary: boolean;
    generateImages: boolean;
  }) => void;
  loading?: boolean;
}

export function GenerateAvatarWithAIDialog({
  open,
  onOpenChange,
  onGenerate,
  loading,
}: GenerateAvatarWithAIDialogProps) {
  const [avatarName, setAvatarName] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [generateSummary, setGenerateSummary] = useState(true);
  const [generateImages, setGenerateImages] = useState(true);

  const handleGenerate = () => {
    onGenerate({
      avatarName: avatarName.trim() || undefined,
      userPrompt: userPrompt.trim() || undefined,
      generateSummary,
      generateImages,
    });
    // Reset form
    setAvatarName("");
    setUserPrompt("");
    setGenerateSummary(true);
    setGenerateImages(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Avatar with AI
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="avatar-name">Avatar Name (Optional)</Label>
            <Input
              id="avatar-name"
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
              placeholder="e.g., 'Enterprise Decision Maker' (leave blank for AI to suggest)"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              AI will suggest a name if you leave this blank
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-prompt">Context / Guidance (Optional)</Label>
            <Textarea
              id="user-prompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g., 'Create an avatar for mid-sized enterprise clients' or 'Focus on budget-conscious homeowners'"
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Provide specific guidance to help AI create the right avatar
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-summary"
                checked={generateSummary}
                onCheckedChange={(checked) => setGenerateSummary(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="generate-summary" className="text-sm font-normal cursor-pointer">
                Generate AI Summary (250-400 word narrative)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-images"
                checked={generateImages}
                onCheckedChange={(checked) => setGenerateImages(checked as boolean)}
                disabled={loading || !generateSummary}
              />
              <Label
                htmlFor="generate-images"
                className={`text-sm font-normal cursor-pointer ${!generateSummary ? "opacity-50" : ""}`}
              >
                Generate Avatar Images (3 portraits)
              </Label>
            </div>
            {!generateSummary && (
              <p className="text-xs text-muted-foreground">
                Images require AI summary to be generated first
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
