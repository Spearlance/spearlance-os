import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Upload, Trophy, X } from "lucide-react";

interface ReportBugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportBugDialog({ open, onOpenChange }: ReportBugDialogProps) {
  const { toast } = useToast();
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    stepsToReproduce: "",
    expectedBehavior: "",
    actualBehavior: "",
    severity: "medium" as const,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setScreenshots(Array.from(e.target.files));
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      toast({ title: "Error", description: "No client selected", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload screenshots
      const screenshotUrls: string[] = [];
      for (const file of screenshots) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bug-screenshots')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('bug-screenshots')
          .getPublicUrl(fileName);
        
        screenshotUrls.push(publicUrl);
      }

      // Capture browser and device info
      const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };

      const deviceInfo = {
        type: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        touchSupport: 'ontouchstart' in window,
      };

      // Create bug report
      const { error: insertError } = await supabase
        .from("bug_reports")
        .insert({
          client_id: selectedClient.id,
          reporter_user_id: user.id,
          title: formData.title,
          description: formData.description,
          steps_to_reproduce: formData.stepsToReproduce || null,
          expected_behavior: formData.expectedBehavior || null,
          actual_behavior: formData.actualBehavior || null,
          screenshot_urls: screenshotUrls,
          browser_info: browserInfo,
          device_info: deviceInfo,
          page_url: window.location.href,
          severity: formData.severity,
          status: 'submitted',
        });

      if (insertError) throw insertError;

      toast({
        title: "Bug Report Submitted! 🎉",
        description: "Thank you for helping us improve! Our team will review it soon.",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        stepsToReproduce: "",
        expectedBehavior: "",
        actualBehavior: "",
        severity: "medium",
      });
      setScreenshots([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting bug report:", error);
      toast({
        title: "Error",
        description: "Failed to submit bug report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Help us improve the platform by reporting bugs you encounter.
          </DialogDescription>
        </DialogHeader>

        {/* Gamification Banner */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100 mb-1">
                🏆 Help Us Improve & Earn Recognition!
              </h4>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                Valid bug reports earn you points and exclusive perks:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                  <strong>Critical:</strong> 50 pts
                </div>
                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                  <strong>High:</strong> 30 pts
                </div>
                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                  <strong>Medium:</strong> 15 pts
                </div>
                <div className="bg-white/50 dark:bg-black/20 p-2 rounded">
                  <strong>Low:</strong> 5 pts
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the bug"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity *</Label>
            <Select
              value={formData.severity}
              onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical - System broken</SelectItem>
                <SelectItem value="high">High - Major feature broken</SelectItem>
                <SelectItem value="medium">Medium - Feature partially broken</SelectItem>
                <SelectItem value="low">Low - Minor issue</SelectItem>
                <SelectItem value="cosmetic">Cosmetic - Visual issue only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what happened..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stepsToReproduce">Steps to Reproduce</Label>
            <Textarea
              id="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedBehavior">Expected Behavior</Label>
              <Textarea
                id="expectedBehavior"
                value={formData.expectedBehavior}
                onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                placeholder="What should happen?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualBehavior">Actual Behavior</Label>
              <Textarea
                id="actualBehavior"
                value={formData.actualBehavior}
                onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                placeholder="What actually happens?"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshots">Screenshots (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="screenshots"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('screenshots')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Screenshots
              </Button>
              <span className="text-sm text-muted-foreground">
                {screenshots.length} file(s) selected
              </span>
            </div>
            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {screenshots.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs"
                  >
                    {file.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeScreenshot(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Bug Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
