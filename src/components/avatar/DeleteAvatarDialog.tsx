import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteAvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteAvatarDialog({ 
  open, 
  onOpenChange, 
  avatarName, 
  onConfirm,
  loading 
}: DeleteAvatarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Avatar?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This will permanently delete <span className="font-semibold">"{avatarName}"</span> and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
