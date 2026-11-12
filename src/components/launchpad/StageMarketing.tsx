import { useState, useEffect, useRef } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { MarketingData } from "@/lib/launchpadTypes";

interface Service {
  id: string;
  name: string;
  description?: string;
  differentiators?: string;
  key_benefits?: string[];
}

interface StageMarketingProps {
  submissionId: string;
  onContinue: () => void;
  onBack: () => void;
  onSaveExit: () => void;
}

export function StageMarketing({ submissionId, onContinue, onBack, onSaveExit }: StageMarketingProps) {
  const { selectedClient } = useClient();
  const { setSaveStatus } = useSaveStatus();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [newBenefit, setNewBenefit] = useState("");
  
  // Social strategy state
  const [postingFrequency, setPostingFrequency] = useState<'daily' | 'weekdays' | 'custom'>('weekdays');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [topicDistribution, setTopicDistribution] = useState({
    educational: 25,
    behind_the_scenes: 25,
    customer_stories: 20,
    promotional: 15,
    quick_tips: 15,
  });

  // Service edits show up in the fields immediately; the DB write is debounced and
  // serialized so a slow response can never overwrite newer typing.
  const pendingServiceUpdates = useRef<Record<string, Partial<Service>>>({});
  const serviceSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceSaveChain = useRef<Promise<boolean>>(Promise.resolve(true));

  useEffect(() => {
    loadServices();
  }, [selectedClient]);

  // Keep the last edits when leaving the stage (Back, sidebar navigation, etc.)
  useEffect(() => {
    return () => {
      void flushServiceUpdates();
    };
  }, []);

  const loadServices = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("client_id", selectedClient.id);

    if (error) {
      console.error("Error loading services:", error);
      setSaveStatus('error', "Failed to load services");
      return;
    }

    setServices(data || []);
    if (data && data.length > 0 && !selectedServiceId) {
      setSelectedServiceId(data[0].id);
    }

    // Restore the posting schedule and content mix saved earlier
    const { data: submissionData } = await supabase
      .from("launchpad_submissions")
      .select("responses_json")
      .eq("id", submissionId)
      .maybeSingle();

    const saved = (submissionData?.responses_json as { marketing?: MarketingData } | null)?.marketing?.social_strategy;
    if (saved) {
      if (saved.posting_frequency) setPostingFrequency(saved.posting_frequency);
      if (Array.isArray(saved.selected_days)) setSelectedDays(saved.selected_days);
      if (saved.topic_distribution) setTopicDistribution(prev => ({ ...prev, ...saved.topic_distribution }));
    }

    setLoading(false);
  };

  const flushServiceUpdates = (): Promise<boolean> => {
    if (serviceSaveTimer.current) {
      clearTimeout(serviceSaveTimer.current);
      serviceSaveTimer.current = null;
    }

    serviceSaveChain.current = serviceSaveChain.current.then(async () => {
      const entries = Object.entries(pendingServiceUpdates.current);
      pendingServiceUpdates.current = {};
      if (entries.length === 0) return true;

      const results = await Promise.all(
        entries.map(([id, updates]) => supabase.from("services").update(updates).eq("id", id))
      );

      let ok = true;
      results.forEach((result, i) => {
        if (!result.error) return;
        ok = false;
        // Keep the failed edits queued (newer edits win) so the next save retries them
        const [id, updates] = entries[i];
        pendingServiceUpdates.current[id] = { ...updates, ...pendingServiceUpdates.current[id] };
      });

      if (ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error', "Failed to update service");
        toast.error("Couldn't save your service details", { description: "Check your connection and try again." });
      }
      return ok;
    });

    return serviceSaveChain.current;
  };

  const updateService = (serviceId: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, ...updates } : s));
    pendingServiceUpdates.current[serviceId] = { ...pendingServiceUpdates.current[serviceId], ...updates };

    if (serviceSaveTimer.current) clearTimeout(serviceSaveTimer.current);
    serviceSaveTimer.current = setTimeout(() => {
      void flushServiceUpdates();
    }, 600);
  };

  /** Saves the social strategy into responses_json. With complete=true it also marks the stage done and advances to Avatar. */
  const saveMarketing = async (complete: boolean): Promise<boolean> => {
    // Get existing responses_json to preserve other stage data
    const { data: submissionData } = await supabase
      .from("launchpad_submissions")
      .select("responses_json")
      .eq("id", submissionId)
      .maybeSingle();

    if (!submissionData) {
      setSaveStatus('error', "Failed to load submission data");
      toast.error("Couldn't save your progress", { description: "Please try again." });
      return false;
    }

    const existingResponses = (submissionData.responses_json as Record<string, any>) || {};
    const socialStrategy = {
      posting_frequency: postingFrequency,
      selected_days: selectedDays,
      topic_distribution: topicDistribution,
    };

    // Merge with existing data instead of overwriting
    const updatedResponses = {
      ...existingResponses,
      marketing: {
        ...(existingResponses.marketing || {}),
        services_completed: complete || existingResponses.marketing?.services_completed === true,
        social_strategy: socialStrategy,
      },
    };

    const { error } = await supabase
      .from("launchpad_submissions")
      .update({
        ...(complete ? { stage: "avatar" as const } : {}),
        responses_json: updatedResponses as any,
      })
      .eq("id", submissionId);

    if (error) {
      setSaveStatus('error', "Failed to save progress");
      toast.error("Couldn't save your progress", { description: "Please try again." });
      return false;
    }

    // Also save to social_media_strategy table for immediate use (only once the mix is valid)
    const totalPercentage = Object.values(topicDistribution).reduce((sum, val) => sum + val, 0);
    if (selectedClient?.id && totalPercentage === 100) {
      // The one-global-row-per-client rule is a partial unique index, which upsert's
      // ON CONFLICT can't target, so update the existing row or insert the first one.
      const strategy = {
        posting_frequency: postingFrequency,
        selected_days: selectedDays,
        topic_distribution: topicDistribution,
      };
      const { data: updatedRows, error: updateError } = await supabase
        .from("social_media_strategy")
        .update(strategy)
        .eq("client_id", selectedClient.id)
        .eq("is_global", true)
        .select("id");

      let strategyError = updateError;
      if (!updateError && (!updatedRows || updatedRows.length === 0)) {
        const { error: insertError } = await supabase
          .from("social_media_strategy")
          .insert({ client_id: selectedClient.id, is_global: true, ...strategy });
        strategyError = insertError;
      }

      if (strategyError) {
        console.error("Error saving social strategy:", strategyError);
        // Don't block progression if this fails
      }
    }

    return true;
  };

  const handleContinue = async () => {
    // Validate topic distribution
    const totalPercentage = Object.values(topicDistribution).reduce((sum, val) => sum + val, 0);
    if (totalPercentage !== 100) {
      setSaveStatus('error', "Content mix must total 100%");
      toast.error("Content mix must total 100%");
      return;
    }

    if (!(await flushServiceUpdates())) return;
    if (!(await saveMarketing(true))) return;

    onContinue();
  };

  const handleSaveExit = async () => {
    if (!(await flushServiceUpdates())) return;
    if (!(await saveMarketing(false))) return;

    onSaveExit();
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const selectedService = services.find(s => s.id === selectedServiceId);
  const totalPercentage = Object.values(topicDistribution).reduce((sum, val) => sum + val, 0);
  const postsPerMonth = Math.round((selectedDays.length * 4.33));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">How You Serve Your Customers</h2>
          <p className="text-muted-foreground mt-1">
            Help your AI understand what makes your services valuable so it can create compelling content.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Services</CardTitle>
          <CardDescription>
            Add marketing details for each service to help with campaign creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <TabsList className="mb-6">
              {services.map(service => (
                <TabsTrigger key={service.id} value={service.id}>
                  {service.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {services.map(service => (
              <TabsContent key={service.id} value={service.id} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <Label htmlFor="description">Service Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe this service in detail..."
                      value={service.description || ""}
                      onChange={(e) => updateService(service.id, { description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="differentiators">What Makes This Service Different?</Label>
                    <Textarea
                      id="differentiators"
                      placeholder="What sets you apart from competitors?"
                      value={service.differentiators || ""}
                      onChange={(e) => updateService(service.id, { differentiators: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Key Benefits</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {service.key_benefits?.map((benefit, index) => (
                          <Badge key={index} variant="secondary">
                            {benefit}
                            <button
                              type="button"
                              className="ml-2 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const updated = service.key_benefits?.filter((_, i) => i !== index);
                                updateService(service.id, { key_benefits: updated });
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a key benefit"
                          value={newBenefit}
                          onChange={(e) => setNewBenefit(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newBenefit.trim()) {
                              e.preventDefault();
                              updateService(service.id, {
                                key_benefits: [...(service.key_benefits || []), newBenefit.trim()]
                              });
                              setNewBenefit("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (newBenefit.trim()) {
                              updateService(service.id, {
                                key_benefits: [...(service.key_benefits || []), newBenefit.trim()]
                              });
                              setNewBenefit("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Media Strategy</CardTitle>
          <CardDescription>
            Set up your default posting schedule and content mix
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Posting Schedule</Label>
            <RadioGroup value={postingFrequency} onValueChange={(value: any) => {
              setPostingFrequency(value);
              if (value === 'daily') {
                setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
              } else if (value === 'weekdays') {
                setSelectedDays([1, 2, 3, 4, 5]);
              }
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="font-normal cursor-pointer">Daily (7 days/week)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekdays" id="weekdays" />
                <Label htmlFor="weekdays" className="font-normal cursor-pointer">Weekdays (Mon-Fri)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">Custom days</Label>
              </div>
            </RadioGroup>

            {postingFrequency === 'custom' && (
              <div className="flex gap-2 flex-wrap">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <Toggle
                    key={index}
                    pressed={selectedDays.includes(index)}
                    onPressedChange={(pressed) => {
                      if (pressed) {
                        setSelectedDays([...selectedDays, index].sort());
                      } else {
                        setSelectedDays(selectedDays.filter(d => d !== index));
                      }
                    }}
                  >
                    {day}
                  </Toggle>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label>Content Mix</Label>
            <div className="space-y-4">
              {Object.entries(topicDistribution).map(([topic, value]) => (
                <div key={topic} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal capitalize">
                      {topic.replace(/_/g, ' ')}
                    </Label>
                    <span className="text-sm text-muted-foreground">{value}%</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([newValue]) => {
                      setTopicDistribution(prev => ({
                        ...prev,
                        [topic]: newValue,
                      }));
                    }}
                    max={100}
                    step={5}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Approximately {postsPerMonth} posts per month
                </AlertDescription>
              </Alert>
              
              {totalPercentage !== 100 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Content mix must total 100% (currently {totalPercentage}%)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button variant="outline" onClick={handleSaveExit}>
          Save & Exit
        </Button>
        <Button onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
