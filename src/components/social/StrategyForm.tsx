import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

interface StrategyFormProps {
  clientId: string;
  month?: number;
  year?: number;
  isGlobal?: boolean;
  onSaved?: () => void;
}

export function StrategyForm({ 
  clientId, 
  month, 
  year, 
  isGlobal = true, 
  onSaved 
}: StrategyFormProps) {
  const queryClient = useQueryClient();

  // Fetch existing strategy
  const { data: strategy, isLoading } = useQuery({
    queryKey: ['social-strategy', clientId, isGlobal, month, year],
    queryFn: async () => {
      let query = supabase
        .from('social_media_strategy')
        .select('*')
        .eq('client_id', clientId);
      
      if (isGlobal) {
        query = query.eq('is_global', true);
      } else {
        query = query.eq('month', month).eq('year', year).eq('is_global', false);
      }
      
      const { data } = await query.maybeSingle();
      return data;
    }
  });

  // Form state
  const [postingFrequency, setPostingFrequency] = useState<'daily' | 'weekdays' | 'custom'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [topicDistribution, setTopicDistribution] = useState({
    educational: 25,
    behind_the_scenes: 25,
    customer_stories: 20,
    promotional: 15,
    quick_tips: 15,
  });

  // Load strategy data when fetched
  useEffect(() => {
    if (strategy) {
      setPostingFrequency(strategy.posting_frequency as any);
      setSelectedDays(strategy.selected_days || [1, 2, 3, 4, 5, 6, 7]);
      setTopicDistribution(strategy.topic_distribution as any);
    }
  }, [strategy]);

  // Calculate posts per month based on selected days
  const postsPerMonth = useMemo(() => {
    // Average 4 weeks per month
    return selectedDays.length * 4;
  }, [selectedDays]);

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return Object.values(topicDistribution).reduce((sum, val) => sum + val, 0);
  }, [topicDistribution]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const strategyData = {
        client_id: clientId,
        is_global: isGlobal,
        month: isGlobal ? null : month,
        year: isGlobal ? null : year,
        posting_frequency: postingFrequency,
        selected_days: selectedDays,
        topic_distribution: topicDistribution,
      };

      if (strategy?.id) {
        const { error } = await supabase
          .from('social_media_strategy')
          .update(strategyData)
          .eq('id', strategy.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('social_media_strategy')
          .insert(strategyData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-strategy'] });
      toast.success('Strategy saved successfully');
      onSaved?.();
    },
    onError: (error: any) => {
      toast.error('Failed to save strategy: ' + error.message);
    }
  });

  const handleSave = () => {
    if (totalPercentage !== 100) {
      toast.error('Topic percentages must sum to 100%');
      return;
    }
    if (selectedDays.length === 0) {
      toast.error('Please select at least one posting day');
      return;
    }
    saveMutation.mutate();
  };

  const monthName = month ? new Date(2025, month - 1).toLocaleString('default', { month: 'long' }) : '';

  if (isLoading) {
    return <div>Loading strategy...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isGlobal ? 'Default Strategy' : `Strategy for ${monthName} ${year}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Posting Schedule */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Posting Schedule</Label>
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
            <Info className="h-4 w-4" />
            <AlertDescription>
              ~{postsPerMonth} posts per month based on your schedule
            </AlertDescription>
          </Alert>
        </div>

        {/* Topic Distribution */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Content Mix</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Adjust the percentage of each post type
            </p>
          </div>

          {Object.entries(topicDistribution).map(([category, value]) => (
            <div key={category}>
              <div className="flex justify-between mb-2">
                <Label className="capitalize font-normal">
                  {category.replace(/_/g, ' ')}
                </Label>
                <span className="text-sm font-medium">{value}%</span>
              </div>
              <Slider
                value={[value]}
                onValueChange={([newValue]) => {
                  setTopicDistribution({ ...topicDistribution, [category]: newValue });
                }}
                max={100}
                step={5}
                className="mb-4"
              />
            </div>
          ))}

          {/* Show validation warning if doesn't sum to 100 */}
          {totalPercentage !== 100 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Percentages must sum to 100% (currently {totalPercentage}%)
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={saveMutation.isPending || totalPercentage !== 100 || selectedDays.length === 0}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Strategy'}
        </Button>
      </CardContent>
    </Card>
  );
}
