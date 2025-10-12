import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DiscoveryData } from "@/lib/launchpadTypes";
import { useClient } from "@/contexts/ClientContext";
import { StoryModal } from "./StoryModal";

const discoverySchema = z.object({
  company: z.object({
    legal_name: z.string().min(1, "Required"),
    brand_name: z.string().min(1, "Required"),
    website_url: z.string().url("Must be a valid URL").refine((url) => url.startsWith("http"), "Must start with http:// or https://"),
    hq_city: z.string().optional(),
    service_areas: z.array(z.string()).optional(),
    industry: z.string().min(1, "Required"),
  }),
  contacts: z.object({
    primary_name: z.string().min(1, "Required"),
    primary_email: z.string().email("Invalid email"),
    decision_makers: z.array(z.string()).optional(),
  }),
  model: z.object({
    core_offers: z.string().min(1, "Required"),
    aov: z.number().nullable().optional(),
    ltv: z.number().nullable().optional(),
    sales_process: z.string().optional(),
  }),
  goals: z.object({
    quarter_goals: z.array(z.string()).min(1, "Add at least one goal").max(3, "Maximum 3 goals"),
    annual_revenue_goal: z.number().nullable().optional(),
  }),
  state: z.object({
    working: z.string().optional(),
    not_working: z.string().optional(),
    constraints: z.string().optional(),
  }),
  competition: z.object({
    competitors: z.array(z.string()).optional(),
  }),
  voice: z.object({
    tone: z.string().min(1, "Required"),
    words_to_avoid: z.string().optional(),
  }),
  story: z.object({
    recording_url: z.string().optional(),
    recording_asset_id: z.string().optional(),
    completed: z.boolean(),
  }).optional(),
});

interface StageDiscoveryProps {
  submissionId: string;
  initialData?: DiscoveryData;
  onContinue: () => void;
  onSaveExit: () => void;
}

export function StageDiscovery({ submissionId, initialData, onContinue, onSaveExit }: StageDiscoveryProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [goalInput, setGoalInput] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  const form = useForm<DiscoveryData>({
    resolver: zodResolver(discoverySchema),
    defaultValues: initialData || {
      company: { legal_name: "", brand_name: "", website_url: "", industry: "", service_areas: [] },
      contacts: { primary_name: "", primary_email: "", decision_makers: [] },
      model: { core_offers: "", aov: null, ltv: null },
      goals: { quarter_goals: [], annual_revenue_goal: null },
      state: {},
      competition: { competitors: [] },
      voice: { tone: "" },
      story: { recording_url: "", recording_asset_id: "", completed: false },
    },
  });

  const saveData = async (data: DiscoveryData, showToast = false) => {
    setSaveStatus("saving");
    try {
      // Mirror website_url to clients table if empty
      if (selectedClient && data.company.website_url) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("website_url")
          .eq("id", selectedClient.id)
          .single();

        if (clientData && !clientData.website_url) {
          await supabase
            .from("clients")
            .update({ website_url: data.company.website_url })
            .eq("id", selectedClient.id);
        }
      }

      const { error } = await supabase
        .from("launchpad_submissions")
        .update({
          responses_json: { discovery: data } as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (error) throw error;

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);

      if (showToast) {
        toast({ title: "Progress saved" });
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("idle");
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  const handleContinue = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    try {
      const data = form.getValues();
      await saveData(data);

      // Advance stage
      const { error } = await supabase
        .from("launchpad_submissions")
        .update({
          stage: "access",
          completed_at: { discovery: new Date().toISOString() } as any,
        })
        .eq("id", submissionId);

      if (error) throw error;

      onContinue();
    } catch (error) {
      console.error("Continue error:", error);
      toast({ title: "Error advancing stage", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveExit = async () => {
    await saveData(form.getValues(), true);
    onSaveExit();
  };

  const addGoal = () => {
    const currentGoals = form.getValues("goals.quarter_goals") || [];
    if (goalInput.trim() && currentGoals.length < 3) {
      form.setValue("goals.quarter_goals", [...currentGoals, goalInput.trim()]);
      setGoalInput("");
    }
  };

  const removeGoal = (index: number) => {
    const currentGoals = form.getValues("goals.quarter_goals") || [];
    form.setValue("goals.quarter_goals", currentGoals.filter((_, i) => i !== index));
  };

  const addCompetitor = () => {
    const currentCompetitors = form.getValues("competition.competitors") || [];
    if (competitorInput.trim()) {
      form.setValue("competition.competitors", [...currentCompetitors, competitorInput.trim()]);
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (index: number) => {
    const currentCompetitors = form.getValues("competition.competitors") || [];
    form.setValue("competition.competitors", currentCompetitors.filter((_, i) => i !== index));
  };

  // Auto-save on blur with debounce
  useEffect(() => {
    const subscription = form.watch((value) => {
      const timer = setTimeout(() => {
        if (value) saveData(value as DiscoveryData);
      }, 500);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const isFormValid = form.formState.isValid && form.watch("story.completed");

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Discovery Stage</h2>
            <p className="text-sm text-muted-foreground">
              Tell us about your business, target market, and marketing goals. This information will seed your customer avatar and messaging.
            </p>
          </div>
          {saveStatus !== "idle" && (
            <p className="text-xs text-muted-foreground">
              {saveStatus === "saving" ? "Saving..." : "Saved ✓"}
            </p>
          )}
        </div>

        <div className="space-y-8 bg-card p-6 rounded-lg border">
          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-semibold">Company</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="legal_name">Legal Business Name *</Label>
                <Input id="legal_name" {...form.register("company.legal_name")} onBlur={() => form.trigger("company.legal_name")} />
                {form.formState.errors.company?.legal_name && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.company.legal_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="brand_name">Public Brand Name *</Label>
                <Input id="brand_name" {...form.register("company.brand_name")} onBlur={() => form.trigger("company.brand_name")} />
                {form.formState.errors.company?.brand_name && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.company.brand_name.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="website_url">Website URL *</Label>
              <Input id="website_url" type="url" placeholder="https://example.com" {...form.register("company.website_url")} onBlur={() => form.trigger("company.website_url")} />
              {form.formState.errors.company?.website_url && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.company.website_url.message}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hq_city">Headquarters City</Label>
                <Input id="hq_city" {...form.register("company.hq_city")} />
              </div>
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Select value={form.watch("company.industry")} onValueChange={(value) => form.setValue("company.industry", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Home Services">Home Services</SelectItem>
                    <SelectItem value="E-commerce">E-commerce</SelectItem>
                    <SelectItem value="SaaS">SaaS</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.company?.industry && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.company.industry.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contacts</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_name">Primary Contact Name *</Label>
                <Input id="primary_name" {...form.register("contacts.primary_name")} onBlur={() => form.trigger("contacts.primary_name")} />
                {form.formState.errors.contacts?.primary_name && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.contacts.primary_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="primary_email">Primary Contact Email *</Label>
                <Input id="primary_email" type="email" {...form.register("contacts.primary_email")} onBlur={() => form.trigger("contacts.primary_email")} />
                {form.formState.errors.contacts?.primary_email && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.contacts.primary_email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Model */}
          <div className="space-y-4">
            <h3 className="font-semibold">Business Model</h3>
            <div>
              <Label htmlFor="core_offers">Core Offers *</Label>
              <Textarea id="core_offers" rows={3} {...form.register("model.core_offers")} onBlur={() => form.trigger("model.core_offers")} />
              {form.formState.errors.model?.core_offers && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.model.core_offers.message}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aov">Average Order Value</Label>
                <Input id="aov" type="number" {...form.register("model.aov", { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="ltv">Customer Lifetime Value</Label>
                <Input id="ltv" type="number" {...form.register("model.ltv", { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <Label htmlFor="sales_process">Sales Process</Label>
              <Textarea id="sales_process" rows={2} {...form.register("model.sales_process")} />
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-4">
            <h3 className="font-semibold">Goals</h3>
            <div>
              <Label>Top 3 Goals (Next 90 Days) *</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add a goal..."
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGoal())}
                  disabled={(form.watch("goals.quarter_goals")?.length || 0) >= 3}
                />
                <Button type="button" onClick={addGoal} disabled={(form.watch("goals.quarter_goals")?.length || 0) >= 3}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.watch("goals.quarter_goals")?.map((goal, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {goal}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeGoal(index)} />
                  </Badge>
                ))}
              </div>
              {form.formState.errors.goals?.quarter_goals && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.goals.quarter_goals.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="annual_revenue_goal">Annual Revenue Goal</Label>
              <Input id="annual_revenue_goal" type="number" {...form.register("goals.annual_revenue_goal", { valueAsNumber: true })} />
            </div>
          </div>

          {/* Current State */}
          <div className="space-y-4">
            <h3 className="font-semibold">Current State</h3>
            <div>
              <Label htmlFor="working">What's Working</Label>
              <Textarea id="working" rows={2} {...form.register("state.working")} />
            </div>
            <div>
              <Label htmlFor="not_working">What's Not Working</Label>
              <Textarea id="not_working" rows={2} {...form.register("state.not_working")} />
            </div>
            <div>
              <Label htmlFor="constraints">Biggest Constraints</Label>
              <Textarea id="constraints" rows={2} {...form.register("state.constraints")} />
            </div>
          </div>

          {/* Competition */}
          <div className="space-y-4">
            <h3 className="font-semibold">Competition</h3>
            <div>
              <Label>Top Competitors (URLs)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="https://competitor.com"
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                />
                <Button type="button" onClick={addCompetitor}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.watch("competition.competitors")?.map((competitor, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {competitor}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeCompetitor(index)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Voice & Tone */}
          <div className="space-y-4">
            <h3 className="font-semibold">Voice & Tone</h3>
            <div>
              <Label htmlFor="tone">Preferred Tone *</Label>
              <Select value={form.watch("voice.tone")} onValueChange={(value) => form.setValue("voice.tone", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Bold">Bold</SelectItem>
                  <SelectItem value="Calm">Calm</SelectItem>
                  <SelectItem value="Analytical">Analytical</SelectItem>
                  <SelectItem value="Playful">Playful</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.voice?.tone && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.voice.tone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="words_to_avoid">Words to Avoid</Label>
              <Textarea id="words_to_avoid" rows={2} {...form.register("voice.words_to_avoid")} />
            </div>
          </div>

          {/* Tell Your Story Section */}
          <div className="bg-[#1a1a1f] p-6 rounded-lg border border-white/10 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Tell Your Story (Required)</h3>
                <p className="text-sm text-muted-foreground">
                  We use your story to capture your authentic voice and build your brand messaging. 
                  Take 5–10 minutes to record your answers.
                </p>
              </div>
              {form.watch("story.completed") && (
                <Badge className="bg-[#13cf48] text-white">
                  ✓ Completed
                </Badge>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setStoryModalOpen(true)}
              variant="outline"
              className="w-full border-[#13cf48] text-[#13cf48] hover:bg-[#13cf48]/10"
            >
              {form.watch("story.completed") ? "View/Edit Story" : "Record or Upload Story"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleSaveExit}>
          Save & Exit
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!isFormValid || isSaving}
          className="bg-[#13cf48] hover:bg-[#10b93d] text-white"
        >
          {isSaving ? "Saving..." : "Continue"}
        </Button>
      </div>

      <StoryModal
        open={storyModalOpen}
        onOpenChange={setStoryModalOpen}
        submissionId={submissionId}
        clientId={selectedClient?.id || ""}
        initialData={form.watch("story")}
        onSuccess={(storyData) => {
          form.setValue("story", storyData);
          saveData(form.getValues());
          setStoryModalOpen(false);
        }}
      />
    </div>
  );
}
