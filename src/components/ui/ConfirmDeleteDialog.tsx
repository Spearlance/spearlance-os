import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  /** Custom body content rendered between description and footer */
  children?: React.ReactNode;
  confirmText?: string;
  loading?: boolean;
  /**
   * When true, the user must type "DELETE" before the confirm button enables.
   * Useful for destructive actions that cannot be undone.
   */
  requireTypedConfirm?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  children,
  confirmText = "Delete",
  loading = false,
  requireTypedConfirm = false,
}: ConfirmDeleteDialogProps) {
  const [typedValue, setTypedValue] = useState("");

  const isConfirmDisabled =
    loading || (requireTypedConfirm && typedValue !== "DELETE");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTypedValue("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {(children || requireTypedConfirm) && (
          <div className="space-y-4 py-2">
            {children}
            {requireTypedConfirm && (
              <div className="space-y-2">
                <Label htmlFor="confirm-delete-input" className="text-foreground">
                  Type{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">DELETE</code>{" "}
                  to confirm:
                </Label>
                <Input
                  id="confirm-delete-input"
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  placeholder="Type DELETE here"
                  disabled={loading}
                />
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={loading}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isConfirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
