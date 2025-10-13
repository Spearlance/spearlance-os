import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateAvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { avatarName: string; tags: string; note: string }) => void;
  loading?: boolean;
}

export function CreateAvatarDialog({ open, onOpenChange, onSave, loading }: CreateAvatarDialogProps) {
  const [avatarName, setAvatarName] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");

  const handleSave = () => {
    if (!avatarName.trim()) return;
    onSave({ avatarName, tags, note });
    setAvatarName("");
    setTags("");
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Avatar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="avatar-name">Avatar Name *</Label>
            <Input
              id="avatar-name"
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
              placeholder="e.g., Tech-Savvy Entrepreneur"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., B2B, Enterprise, SaaS"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Short Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any notes about this avatar..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!avatarName.trim() || loading}>
              {loading ? "Creating..." : "Create Avatar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
