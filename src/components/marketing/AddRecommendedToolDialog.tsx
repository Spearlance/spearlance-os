import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface AddRecommendedToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendedTool: any;
  clientId: string;
  onSave: (toolData: any) => void;
  loading?: boolean;
}

export function AddRecommendedToolDialog({
  open,
  onOpenChange,
  recommendedTool,
  clientId,
  onSave,
  loading,
}: AddRecommendedToolDialogProps) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [costPerMonth, setCostPerMonth] = useState("");

  useEffect(() => {
    if (open && recommendedTool) {
      setUrl("");
      setDescription(recommendedTool.description || "");
      setOwner("");
      setCostPerMonth("");
    }
  }, [open, recommendedTool]);

  const handleSave = () => {
    if (!url.trim()) return;

    onSave({
      name: recommendedTool.name,
      category: recommendedTool.category,
      logo_url: recommendedTool.logo_url,
      url: url.trim(),
      description: description.trim(),
      owner: owner.trim() || null,
      cost_per_month: costPerMonth ? parseFloat(costPerMonth) : null,
      affiliate_url: recommendedTool.url, // Store the affiliate link
    });
  };

  if (!recommendedTool) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add {recommendedTool.name} to Your Tools</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tool Name</Label>
            <Input value={recommendedTool.name} disabled />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={recommendedTool.category} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Your Account URL *</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourworkspace.tool.com"
            />
            <p className="text-xs text-muted-foreground">
              Enter the URL to your account or workspace for this tool
            </p>
          </div>

          {recommendedTool.url && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground mb-2">
                Don't have an account yet?
              </p>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={recommendedTool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Sign up with our partner link
                </a>
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How you use this tool..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Tool Owner (Optional)</Label>
            <Input
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g., John Smith, Marketing Team, jane@company.com"
            />
            <p className="text-xs text-muted-foreground">
              Who owns or manages this tool?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost per Month (Optional)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={costPerMonth}
              onChange={(e) => setCostPerMonth(e.target.value)}
              placeholder="29.99"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!url.trim() || loading}>
            {loading ? "Adding..." : "Add Tool"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
