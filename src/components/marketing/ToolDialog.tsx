import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchFavicon } from "@/lib/faviconUtils";
import { Loader2 } from "lucide-react";

interface ToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: any | null;
  clientId: string;
  onSave: (data: any) => void;
  loading?: boolean;
  isAdmin?: boolean;
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

export function ToolDialog({ open, onOpenChange, tool, clientId, onSave, loading, isAdmin = false }: ToolDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "other",
    url: "",
    logo_url: "",
    description: "",
    credentials_notes: "",
    cost_per_month: "",
    affiliate_url: "",
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
        credentials_notes: tool.credentials_notes || "",
        cost_per_month: tool.cost_per_month?.toString() || "",
        affiliate_url: tool.affiliate_url || "",
      });
    } else {
      setFormData({
        name: "",
        category: "other",
        url: "",
        logo_url: "",
        description: "",
        credentials_notes: "",
        cost_per_month: "",
        affiliate_url: "",
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
      client_id: clientId,
      name: formData.name,
      category: formData.category,
      url: formData.url,
      logo_url: formData.logo_url || null,
      description: formData.description || null,
      credentials_notes: formData.credentials_notes || null,
      cost_per_month: formData.cost_per_month ? parseFloat(formData.cost_per_month) : null,
    };

    // Only admins can set affiliate URLs
    if (isAdmin) {
      saveData.affiliate_url = formData.affiliate_url || null;
    }

    if (tool) {
      saveData.id = tool.id;
    }

    onSave(saveData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Edit Tool" : "Add Tool"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tool Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Google Ads"
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
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              onBlur={handleUrlBlur}
              placeholder="https://ads.google.com"
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this tool is used for"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credentials_notes">Credentials Notes</Label>
            <Textarea
              id="credentials_notes"
              value={formData.credentials_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, credentials_notes: e.target.value }))}
              placeholder="Where login info is stored, who has access, etc."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_per_month">Monthly Cost ($)</Label>
            <Input
              id="cost_per_month"
              type="number"
              step="0.01"
              value={formData.cost_per_month}
              onChange={(e) => setFormData(prev => ({ ...prev, cost_per_month: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="affiliate_url">Affiliate/Sign Up Link (Optional)</Label>
              <Input
                id="affiliate_url"
                type="url"
                value={formData.affiliate_url}
                onChange={(e) => setFormData(prev => ({ ...prev, affiliate_url: e.target.value }))}
                placeholder="https://tool.com/signup?ref=yourcode"
              />
              <p className="text-xs text-muted-foreground">
                If provided, a "Sign Up" button will appear on the tool card
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || !formData.url || !formData.category || loading}
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
