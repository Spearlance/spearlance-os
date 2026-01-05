import { useState } from "react";
import { format } from "date-fns";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import spearlanceLogo from '@/assets/spearlance-logo.png';
import { parseUTCDate } from "@/lib/utils";

interface BlogMonthlyGeneratorProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  month: number;
  year: number;
  generationType: 'all' | 'missing';
  existingTopicDates: string[];
  expectedPostCount: number;
  activeStrategy: any;
}

export function BlogMonthlyGenerator({ 
  clientId, 
  open, 
  onOpenChange, 
  onComplete,
  month,
  year,
  generationType,
  existingTopicDates = [],
  expectedPostCount = 0,
  activeStrategy
}: BlogMonthlyGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<string>("");
  
  const selectedMonthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    if (generationType === 'all') {
      setProgress(`Generating all ${expectedPostCount} blog topics...`);
    } else {
      const existingCount = existingTopicDates.filter(date => {
        const d = parseUTCDate(date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      }).length;
      const missingCount = expectedPostCount - existingCount;
      setProgress(`Generating ${missingCount} topics for missing days...`);
    }

    try {
      const { data, error } = await supabase.functions.invoke('blog-generate-monthly-topics', {
        body: { 
          client_id: clientId,
          month,
          year,
          generation_type: generationType,
        },
      });

      if (error) throw error;

      setProgress("Creating your blog calendar...");
      await new Promise(resolve => setTimeout(resolve, 500));

        setIsComplete(true);
        setProgress(`🎉 Success! ${data.topics_created} topics created for ${selectedMonthName}`);
        
        toast.success(`Blog topics created!`, {
          description: `${data.topics_created} topics ready for ${selectedMonthName}. Start creating articles!`,
        });

        // Call onComplete immediately to trigger refetch while success screen shows
        onComplete();

        // Close dialog after showing success for 2 seconds
        setTimeout(() => {
          onOpenChange(false);
          setIsComplete(false);
          setIsGenerating(false);
          setProgress("");
        }, 2000);

    } catch (error: any) {
      console.error('Error generating blog topics:', error);
      toast.error("Generation Failed", {
        description: error.message || "Failed to generate blog topics. Please try again.",
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
            {generationType === 'all' ? `Generate All Topics (${expectedPostCount})` : 'Fill Missing Days'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isGenerating && !isComplete && (
            <>
              {generationType === 'all' && existingTopicDates.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will replace all existing topics for {selectedMonthName}. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
              
              {generationType === 'missing' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(() => {
                      const existingCount = existingTopicDates.filter(date => {
                        const d = parseUTCDate(date);
                        return d.getMonth() + 1 === month && d.getFullYear() === year;
                      }).length;
                      const missingCount = expectedPostCount - existingCount;
                      return `${missingCount} topics will be generated for days without content. Existing topics will be kept.`;
                    })()}
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground">
                {generationType === 'all' 
                  ? `Create your entire blog content calendar for ${selectedMonthName} in seconds! We'll generate:`
                  : `Fill in the gaps in your ${selectedMonthName} calendar! We'll generate:`}
              </p>
              
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>{expectedPostCount} blog topics</strong> tailored to your brand and audience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Smart distribution</strong> across content categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>SEO-optimized keywords</strong> for each topic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Strategy-based scheduling</strong> based on your content plan</span>
                </li>
              </ul>
              
              <p className="text-sm text-muted-foreground">
                After generation, you can create full articles with one click!
              </p>
            </>
          )}

          {(isGenerating || isComplete) && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              {isComplete ? (
                <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center animate-pulse">
                  <img 
                    src={spearlanceLogo} 
                    alt="Generating topics"
                    className="h-10 w-10"
                  />
                </div>
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
              Generate {selectedMonthName} Plan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
