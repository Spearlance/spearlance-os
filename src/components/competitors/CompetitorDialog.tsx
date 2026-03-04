import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Competitor {
  id: string;
  client_id: string;
  name: string;
  website_url?: string;
  description?: string;
  strengths?: string;
  weaknesses?: string;
  why_we_are_better?: string;
  pricing_strategy?: string;
  target_market?: string;
  notes?: string;
}

interface CompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitor?: Competitor | null;
  clientId: string;
  onSuccess: () => void;
}

export function CompetitorDialog({ open, onOpenChange, competitor, clientId, onSuccess }: CompetitorDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    website_url: "",
    description: "",
    strengths: "",
    weaknesses: "",
    why_we_are_better: "",
    pricing_strategy: "",
    target_market: "",
    notes: "",
  });

  useEffect(() => {
    if (competitor) {
      setForm({
        name: competitor.name || "",
        website_url: competitor.website_url || "",
        description: competitor.description || "",
        strengths: competitor.strengths || "",
        weaknesses: competitor.weaknesses || "",
        why_we_are_better: competitor.why_we_are_better || "",
        pricing_strategy: competitor.pricing_strategy || "",
        target_market: competitor.target_market || "",
        notes: competitor.notes || "",
      });
    } else {
      setForm({
        name: "",
        website_url: "",
        description: "",
        strengths: "",
        weaknesses: "",
        why_we_are_better: "",
        pricing_strategy: "",
        target_market: "",
        notes: "",
      });
    }
  }, [competitor, open]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Validation Error", { description: "Competitor name is required" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        name: form.name.trim(),
        website_url: form.website_url.trim() || null,
        description: form.description.trim() || null,
        strengths: form.strengths.trim() || null,
        weaknesses: form.weaknesses.trim() || null,
        why_we_are_better: form.why_we_are_better.trim() || null,
        pricing_strategy: form.pricing_strategy.trim() || null,
        target_market: form.target_market.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (competitor) {
        const { error } = await supabase
          .from("competitors")
          .update(payload)
          .eq("id", competitor.id);

        if (error) throw error;

        toast.success("Success", { description: "Competitor updated successfully" });
      } else {
        const { error } = await supabase
          .from("competitors")
          .insert(payload);

        if (error) throw error;

        toast.success("Success", { description: "Competitor added successfully" });
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to save competitor" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{competitor ? "Edit Competitor" : "Add Competitor"}</DialogTitle>
          <DialogDescription>
            Build your competitive intelligence database to help refine positioning and strategy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="name">Competitor Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                placeholder="e.g., acmecorp.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief overview of the competitor..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="strengths">Their Strengths</Label>
            <Textarea
              id="strengths"
              value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })}
              placeholder="What they do well..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="weaknesses">Their Weaknesses</Label>
            <Textarea
              id="weaknesses"
              value={form.weaknesses}
              onChange={(e) => setForm({ ...form, weaknesses: e.target.value })}
              placeholder="Where they fall short..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="why_we_are_better">Why We're Better</Label>
            <Textarea
              id="why_we_are_better"
              value={form.why_we_are_better}
              onChange={(e) => setForm({ ...form, why_we_are_better: e.target.value })}
              placeholder="Our key differentiators and advantages..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pricing_strategy">Their Pricing Strategy</Label>
              <Textarea
                id="pricing_strategy"
                value={form.pricing_strategy}
                onChange={(e) => setForm({ ...form, pricing_strategy: e.target.value })}
                placeholder="e.g., Premium pricing, volume discounts..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="target_market">Their Target Market</Label>
              <Textarea
                id="target_market"
                value={form.target_market}
                onChange={(e) => setForm({ ...form, target_market: e.target.value })}
                placeholder="Who they primarily target..."
                rows={2}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any other observations or intelligence..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              competitor ? "Update" : "Add Competitor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
