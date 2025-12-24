import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { useSaveStatus } from "@/hooks/useSaveStatus";

interface BlogStrategyFormProps {
  clientId: string;
  month?: number;
  year?: number;
  isGlobal?: boolean;
  onSaved?: () => void;
}

export function BlogStrategyForm({ clientId, month, year }: BlogStrategyFormProps) {
  const queryClient = useQueryClient();
  const { setSaveStatus } = useSaveStatus();
  const [postingFrequency, setPostingFrequency] = useState<'daily' | 'weekdays' | 'custom'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [contentMix, setContentMix] = useState({
    how_to: 30,
    case_studies: 20,
    industry_news: 15,
    best_practices: 20,
    company_updates: 15,
  });

  const { data: existingStrategy, isLoading } = useQuery({
    queryKey: ["blog-strategy", clientId, month, year],
    queryFn: async () => {
      let query = supabase
        .from("blog_content_strategy")
        .select("*")
        .eq("client_id", clientId);

      if (month && year) {
        query = query.or(`and(is_global.eq.false,month.eq.${month},year.eq.${year}),is_global.eq.true`);
      } else {
        query = query.eq("is_global", true);
      }

      const { data, error } = await query.order("is_global", { ascending: true }).limit(1).maybeSingle();

      if (error) throw error;
      if (data) {
        setPostingFrequency(data.posting_frequency as any);
        setSelectedDays(data.selected_days || [1, 2, 3, 4, 5, 6, 7]);
        setContentMix(data.content_mix as any);
      }
      return data;
    },
  });

  const saveStrategyMutation = useMutation({
    mutationFn: async () => {
      const strategyData = {
        client_id: clientId,
        posting_frequency: postingFrequency,
        selected_days: selectedDays,
        content_mix: contentMix,
        is_global: !month || !year,
        month: month || null,
        year: year || null,
      };

      if (existingStrategy?.id) {
        const { error } = await supabase
          .from("blog_content_strategy")
          .update(strategyData)
          .eq("id", existingStrategy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_content_strategy").insert(strategyData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-strategy", clientId] });
      setSaveStatus('saved');
    },
    onError: (error) => {
      console.error("Error saving strategy:", error);
      toast.error("Failed to save strategy");
    },
  });

  const handleContentMixChange = (category: string, value: number[]) => {
    setContentMix((prev) => ({ ...prev, [category]: value[0] }));
  };

  const totalPercentage = Object.values(contentMix).reduce((sum, val) => sum + val, 0);
  
  // Calculate actual posts per month based on selected days
  const today = new Date();
  const exampleMonth = today.getMonth();
  const exampleYear = today.getFullYear();
  const daysInExampleMonth = new Date(exampleYear, exampleMonth + 1, 0).getDate();
  
  let postsPerMonth = 0;
  for (let day = 1; day <= daysInExampleMonth; day++) {
    const date = new Date(exampleYear, exampleMonth, day);
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    if (selectedDays.includes(isoDayOfWeek)) {
      postsPerMonth++;
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Posting Schedule</h3>
          <RadioGroup 
            value={postingFrequency} 
            onValueChange={(v: any) => {
              setPostingFrequency(v);
              if (v === 'daily') setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
              if (v === 'weekdays') setSelectedDays([1, 2, 3, 4, 5]);
            }}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="font-normal cursor-pointer">Every day (7 days/week)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekdays" id="weekdays" />
              <Label htmlFor="weekdays" className="font-normal cursor-pointer">Weekdays only (5 days/week)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="font-normal cursor-pointer">Custom schedule</Label>
            </div>
          </RadioGroup>

          {postingFrequency === 'custom' && (
            <div className="flex flex-wrap gap-2 pt-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <Toggle
                  key={day}
                  pressed={selectedDays.includes(idx + 1)}
                  onPressedChange={(pressed) => {
                    if (pressed) {
                      setSelectedDays([...selectedDays, idx + 1].sort((a, b) => a - b));
                    } else {
                      setSelectedDays(selectedDays.filter(d => d !== idx + 1));
                    }
                  }}
                  className="min-w-[60px]"
                >
                  {day}
                </Toggle>
              ))}
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ~{postsPerMonth} posts per month based on your schedule
            </AlertDescription>
          </Alert>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Content Mix</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Adjust the percentage of each content type. Total: {totalPercentage}%
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label>How-to Guides</Label>
                <span className="text-sm font-medium">{contentMix.how_to}%</span>
              </div>
              <Slider
                value={[contentMix.how_to]}
                onValueChange={(val) => handleContentMixChange("how_to", val)}
                max={100}
                step={5}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Case Studies</Label>
                <span className="text-sm font-medium">{contentMix.case_studies}%</span>
              </div>
              <Slider
                value={[contentMix.case_studies]}
                onValueChange={(val) => handleContentMixChange("case_studies", val)}
                max={100}
                step={5}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Industry News & Trends</Label>
                <span className="text-sm font-medium">{contentMix.industry_news}%</span>
              </div>
              <Slider
                value={[contentMix.industry_news]}
                onValueChange={(val) => handleContentMixChange("industry_news", val)}
                max={100}
                step={5}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Best Practices</Label>
                <span className="text-sm font-medium">{contentMix.best_practices}%</span>
              </div>
              <Slider
                value={[contentMix.best_practices]}
                onValueChange={(val) => handleContentMixChange("best_practices", val)}
                max={100}
                step={5}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Company Updates</Label>
                <span className="text-sm font-medium">{contentMix.company_updates}%</span>
              </div>
              <Slider
                value={[contentMix.company_updates]}
                onValueChange={(val) => handleContentMixChange("company_updates", val)}
                max={100}
                step={5}
              />
            </div>
          </div>

          {totalPercentage !== 100 && (
            <p className="text-sm text-destructive mt-2">
              Content mix must total 100% (currently {totalPercentage}%)
            </p>
          )}
        </div>

        <Button
          onClick={() => saveStrategyMutation.mutate()}
          disabled={totalPercentage !== 100 || saveStrategyMutation.isPending || selectedDays.length === 0}
          className="w-full"
        >
          {saveStrategyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Strategy
        </Button>
      </div>
    </Card>
  );
}