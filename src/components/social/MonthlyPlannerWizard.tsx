import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MonthlyPlannerWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  month?: number;
  year?: number;
}

const getDefaultMonth = () => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  
  // If after the 20th, suggest next month
  if (dayOfMonth >= 20) {
    return today.getMonth() === 11 ? 1 : today.getMonth() + 2; // +2 because getMonth() is 0-indexed
  }
  return today.getMonth() + 1; // Current month (1-12)
};

const getDefaultYear = () => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  
  // If after 20th of December, suggest next year
  if (today.getMonth() === 11 && dayOfMonth >= 20) {
    return today.getFullYear() + 1;
  }
  return today.getFullYear();
};

const getAvailableMonths = () => {
  const months = [];
  const today = new Date();
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: date.toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  }
  
  return months;
};

export const MonthlyPlannerWizard = ({ open, onOpenChange, onComplete, month, year }: MonthlyPlannerWizardProps) => {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [isComplete, setIsComplete] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(month || getDefaultMonth());
  const [selectedYear, setSelectedYear] = useState<number>(year || getDefaultYear());

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const isSelectingCurrentMonth = selectedMonth === currentMonth && selectedYear === today.getFullYear();
  const showWarning = isSelectingCurrentMonth && currentDay > 15;
  
  const selectedMonthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
  const nextMonthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });

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
          month: selectedMonth,
          year: selectedYear,
        },
      });

      if (error) throw error;

      setProgress("Creating your monthly calendar...");
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsComplete(true);
      setProgress(`🎉 Success! ${data.posts_created} posts created for ${selectedMonthName}`);

      toast({
        title: "Monthly Plan Created!",
        description: `${data.posts_created} posts ready for ${selectedMonthName}. Let's add captions and images!`,
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
            Generate Monthly Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isGenerating && !isComplete && (
            <>
              {/* Month/Year Selector */}
              <div className="space-y-2">
                <Label>Select Month to Plan</Label>
                <Select 
                  value={`${selectedMonth}-${selectedYear}`} 
                  onValueChange={(val) => {
                    const [m, y] = val.split('-');
                    setSelectedMonth(parseInt(m));
                    setSelectedYear(parseInt(y));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMonths().map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Warning if selecting current month late in the month */}
              {showWarning && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    We're already on day {currentDay} of {selectedMonthName}. Consider planning ahead for {nextMonthName}!
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-muted-foreground">
                Create your entire social media calendar for {selectedMonthName} in seconds! We'll generate:
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
              Generate {selectedMonthName} Plan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};