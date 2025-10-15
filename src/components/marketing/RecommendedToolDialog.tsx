import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchFavicon } from "@/lib/faviconUtils";
import { Loader2 } from "lucide-react";

interface RecommendedToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: any | null;
  onSave: (data: any) => void;
  loading?: boolean;
}

const categories = [
  { value: "advertising", label: "Advertising" },
  { value: "design", label: "Design" },
  { value: "analytics", label: "Analytics" },
  { value: "social-media", label: "Social Media" },
  { value: "email-marketing", label: "Email Marketing" },
  { value: "seo", label: "SEO" },
  { value: "crm", label: "CRM" },
  { value: "project-management", label: "Project Management" },
  { value: "automation", label: "Automation" },
  { value: "content-creation", label: "Content Creation" },
  { value: "other", label: "Other" },
];

export function RecommendedToolDialog({ open, onOpenChange, tool, onSave, loading }: RecommendedToolDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "other",
    url: "",
    logo_url: "",
    description: "",
    why_we_recommend: "",
    pricing_model: "",
    is_active: true,
    sort_order: 0,
  });
  const [fetchingFavicon, setFetchingFavicon] = useState(false);

  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name || "",
        category: tool.category || "other",
        url: tool.url || "",
        logo_url: tool.logo_url || "",
        description: tool.description || "",
        why_we_recommend: tool.why_we_recommend || "",
        pricing_model: tool.pricing_model || "",
        is_active: tool.is_active ?? true,
        sort_order: tool.sort_order || 0,
      });
    } else {
      setFormData({
        name: "",
        category: "other",
        url: "",
        logo_url: "",
        description: "",
        why_we_recommend: "",
        pricing_model: "",
        is_active: true,
        sort_order: 0,
      });
    }
  }, [tool, open]);

  const handleUrlBlur = async () => {
    if (formData.url && !formData.logo_url && !tool) {
      setFetchingFavicon(true);
      const favicon = await fetchFavicon(formData.url);
      if (favicon) {
        setFormData(prev => ({ ...prev, logo_url: favicon }));
      }
      setFetchingFavicon(false);
    }
  };

  const handleSave = () => {
    const saveData: any = {
      name: formData.name,
      category: formData.category,
      url: formData.url,
      logo_url: formData.logo_url || null,
      description: formData.description,
      why_we_recommend: formData.why_we_recommend || null,
      pricing_model: formData.pricing_model || null,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
    };

    if (tool) {
      saveData.id = tool.id;
    }

    onSave(saveData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Edit Recommended Tool" : "Add Recommended Tool"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tool Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Mailchimp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Affiliate URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              onBlur={handleUrlBlur}
              placeholder="https://mailchimp.com?ref=your-affiliate-code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL {fetchingFavicon && <span className="text-xs text-muted-foreground">(fetching favicon...)</span>}</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="Auto-fetched from URL or enter custom"
              disabled={fetchingFavicon}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What this tool does"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="why_we_recommend">Why We Recommend</Label>
            <Textarea
              id="why_we_recommend"
              value={formData.why_we_recommend}
              onChange={(e) => setFormData(prev => ({ ...prev, why_we_recommend: e.target.value }))}
              placeholder="Value proposition and benefits"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pricing_model">Pricing Model</Label>
              <Input
                id="pricing_model"
                value={formData.pricing_model}
                onChange={(e) => setFormData(prev => ({ ...prev, pricing_model: e.target.value }))}
                placeholder="e.g., Free, $99/mo, Custom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active (visible to all clients)</Label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || !formData.url || !formData.category || !formData.description || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tool ? "Save Changes" : "Add Tool"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
