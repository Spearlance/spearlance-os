import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";

interface MonthlyPlannerWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const MonthlyPlannerWizard = ({ open, onOpenChange, onComplete }: MonthlyPlannerWizardProps) => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [isComplete, setIsComplete] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });

  const handleGenerate = async () => {
    if (!selectedClient) return;

    setIsGenerating(true);
    setProgress("Analyzing your brand and audience...");

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress("Generating 30 creative post ideas...");

      const { data, error } = await supabase.functions.invoke('social-generate-monthly-topics', {
        body: {
          client_id: selectedClient.id,
          month: currentMonth,
          year: currentYear,
        },
      });

      if (error) throw error;

      setProgress("Creating your monthly calendar...");
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsComplete(true);
      setProgress(`🎉 Success! ${data.posts_created} posts created for ${monthName}`);

      toast({
        title: "Monthly Plan Created!",
        description: `${data.posts_created} posts ready for ${monthName}. Let's add captions and images!`,
      });

      setTimeout(() => {
        onComplete();
        onOpenChange(false);
        setIsComplete(false);
        setIsGenerating(false);
        setProgress("");
      }, 2000);

    } catch (error: any) {
      console.error('Error generating monthly plan:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate monthly plan. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate {monthName} Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isGenerating && !isComplete && (
            <>
              <p className="text-sm text-muted-foreground">
                Create your entire social media calendar for {monthName} in seconds! We'll generate:
              </p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>30 post topics</strong> tailored to your brand and audience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Smart distribution</strong> across categories (education, promotions, tips)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Optimal scheduling</strong> spread throughout the month</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                After generation, you can batch-generate captions and images with one click!
              </p>
            </>
          )}

          {(isGenerating || isComplete) && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              {isComplete ? (
                <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
              ) : (
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              )}
              <p className="text-sm text-center text-muted-foreground animate-pulse">
                {progress}
              </p>
            </div>
          )}
        </div>

        {!isGenerating && !isComplete && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleGenerate} className="flex-1">
              Generate {monthName} Plan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};