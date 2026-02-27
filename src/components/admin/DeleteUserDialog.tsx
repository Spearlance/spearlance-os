import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

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
  const [loading, setLoading] = useState(false);

  const assignedClients = clients
    .filter((c) => user.associated_client_ids?.includes(c.id))
    .map((c) => c.name)
    .join(", ");

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </span>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        title="Delete User Account?"
        description="This action cannot be undone."
        confirmText="Delete User"
        loading={loading}
        requireTypedConfirm={true}
      >
        <div className="rounded-md bg-destructive/10 p-3 space-y-2">
          <p className="font-semibold text-foreground">
            This will permanently delete:
          </p>
          <ul className="text-sm space-y-1 text-foreground">
            <li>
              • User: <strong>{user.name}</strong> ({user.email})
            </li>
            <li>
              • Role: <strong>{user.role}</strong>
            </li>
            {assignedClients && (
              <li>
                • Assigned to: <strong>{assignedClients}</strong>
              </li>
            )}
          </ul>
        </div>
        <p className="text-destructive font-semibold">
          ⚠️ This action CANNOT be undone.
        </p>
      </ConfirmDeleteDialog>
    </>
  );
}
