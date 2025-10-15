import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteUserDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    associated_client_ids?: string[];
  };
  clients: Array<{ id: string; name: string }>;
  onConfirm: () => Promise<void>;
}

export function DeleteUserDialog({ user, clients, onConfirm }: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const assignedClients = clients
    .filter((c) => user.associated_client_ids?.includes(c.id))
    .map((c) => c.name)
    .join(", ");

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;

    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
      setConfirmText("");
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="rounded-md bg-destructive/10 p-3 space-y-2">
              <p className="font-semibold text-foreground">
                This will permanently delete:
              </p>
              <ul className="text-sm space-y-1 text-foreground">
                <li>• User: <strong>{user.name}</strong> ({user.email})</li>
                <li>• Role: <strong>{user.role}</strong></li>
                {assignedClients && (
                  <li>• Assigned to: <strong>{assignedClients}</strong></li>
                )}
              </ul>
            </div>

            <p className="text-destructive font-semibold">
              ⚠️ This action CANNOT be undone.
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className="text-foreground">
                Type <code className="bg-muted px-1 py-0.5 rounded">DELETE</code> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                disabled={loading}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={confirmText !== "DELETE" || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
