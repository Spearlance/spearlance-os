import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link2,
  Plus,
  ExternalLink,
  Trash2,
  Search,
  BarChart3,
  TrendingUp,
  Facebook,
  Megaphone,
  FileText,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useSaveStatus } from "@/hooks/useSaveStatus";

interface QuickLink {
  id: string;
  client_id: string;
  label: string;
  url: string;
  icon?: string;
  display_order: number;
  created_by?: string;
  created_at: string;
}

interface QuickLinksCardProps {
  links: QuickLink[];
  onAddLink: (link: { label: string; url: string; icon?: string; display_order: number }) => Promise<boolean>;
  onDeleteLink: (id: string) => Promise<boolean>;
}

const ICON_OPTIONS = [
  { value: 'search', label: 'Search', icon: Search },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'trending', label: 'SEO', icon: TrendingUp },
  { value: 'facebook', label: 'Social', icon: Facebook },
  { value: 'megaphone', label: 'Ads', icon: Megaphone },
  { value: 'file', label: 'Document', icon: FileText },
  { value: 'globe', label: 'Website', icon: Globe },
];

const PRESETS = [
  { label: 'Google Search Console', url: 'https://search.google.com/search-console', icon: 'search' },
  { label: 'Google Analytics', url: 'https://analytics.google.com', icon: 'analytics' },
  { label: 'SE Ranking', url: 'https://online.seranking.com', icon: 'trending' },
  { label: 'Google Ads', url: 'https://ads.google.com', icon: 'megaphone' },
  { label: 'Facebook Business', url: 'https://business.facebook.com', icon: 'facebook' },
];

export function QuickLinksCard({ links, onAddLink, onDeleteLink }: QuickLinksCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('globe');
  const [saving, setSaving] = useState(false);
  const { setSaveStatus } = useSaveStatus();

  const getIconComponent = (iconName?: string) => {
    const found = ICON_OPTIONS.find(i => i.value === iconName);
    const IconComponent = found?.icon || Link2;
    return <IconComponent className="h-4 w-4" />;
  };

  const handleAddLink = async () => {
    if (!label.trim() || !url.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setSaving(true);
    const success = await onAddLink({
      label: label.trim(),
      url: url.trim(),
      icon,
      display_order: links.length,
    });

    if (success) {
      setSaveStatus('saved');
      setLabel('');
      setUrl('');
      setIcon('globe');
      setDialogOpen(false);
    } else {
      toast.error('Failed to add link');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const success = await onDeleteLink(id);
    if (success) {
      setSaveStatus('saved');
    } else {
      toast.error('Failed to remove link');
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setLabel(preset.label);
    setUrl(preset.url);
    setIcon(preset.icon);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Quick Links
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Quick Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Presets */}
                <div>
                  <Label className="text-xs text-muted-foreground">Quick Add</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Google Search Console"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddLink} disabled={saving} className="w-full">
                  {saving ? 'Adding...' : 'Add Link'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No quick links yet. Add links to external tools for easy access.
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md group"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors flex-1"
                >
                  {getIconComponent(link.icon)}
                  <span>{link.label}</span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(link.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
