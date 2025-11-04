import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BlogStrategyFormProps {
  clientId: string;
  month?: number;
  year?: number;
}

export function BlogStrategyForm({ clientId, month, year }: BlogStrategyFormProps) {
  const queryClient = useQueryClient();
  const [postingFrequency, setPostingFrequency] = useState<string>("weekly");
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
        setPostingFrequency(data.posting_frequency);
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
      toast.success("Blog strategy saved successfully");
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
        <div>
          <h3 className="text-lg font-semibold mb-4">Posting Frequency</h3>
          <RadioGroup value={postingFrequency} onValueChange={setPostingFrequency}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekly" id="weekly" />
              <Label htmlFor="weekly">Weekly (4 posts per month)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bi-weekly" id="bi-weekly" />
              <Label htmlFor="bi-weekly">Bi-weekly (2 posts per month)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly">Monthly (1 post per month)</Label>
            </div>
          </RadioGroup>
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
          disabled={totalPercentage !== 100 || saveStrategyMutation.isPending}
          className="w-full"
        >
          {saveStrategyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Strategy
        </Button>
      </div>
    </Card>
  );
}