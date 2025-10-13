import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface DuplicateAvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalName: string;
  onSave: (data: { avatarName: string; includeAI: boolean; includeImages: boolean }) => void;
  loading?: boolean;
}

export function DuplicateAvatarDialog({ 
  open, 
  onOpenChange, 
  originalName, 
  onSave,
  loading 
}: DuplicateAvatarDialogProps) {
  const [avatarName, setAvatarName] = useState(`Copy of ${originalName}`);
  const [includeAI, setIncludeAI] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);

  const handleSave = () => {
    if (!avatarName.trim()) return;
    onSave({ avatarName, includeAI, includeImages });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Avatar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="dup-avatar-name">Avatar Name *</Label>
            <Input
              id="dup-avatar-name"
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="include-ai" 
                checked={includeAI}
                onCheckedChange={(checked) => setIncludeAI(checked as boolean)}
              />
              <Label htmlFor="include-ai" className="cursor-pointer font-normal">
                Include AI Summary
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="include-images" 
                checked={includeImages}
                onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
              />
              <Label htmlFor="include-images" className="cursor-pointer font-normal">
                Include Images
              </Label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!avatarName.trim() || loading}>
              {loading ? "Duplicating..." : "Duplicate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
