import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

interface DeleteTaskDialogProps {
  taskTitle: string;
  taskId: string;
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
}

export function DeleteTaskDialog({
  taskTitle,
  taskId: _taskId,
  onConfirm,
  trigger,
}: DeleteTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </span>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        title="Delete Task?"
        description="This action cannot be undone."
        confirmText="Delete Task"
        loading={loading}
        requireTypedConfirm={true}
      >
        <div className="rounded-md bg-destructive/10 p-3 space-y-2">
          <p className="font-semibold text-foreground">
            This will permanently delete:
          </p>
          <ul className="text-sm space-y-1 text-foreground">
            <li>
              • Task: <strong>{taskTitle}</strong>
            </li>
            <li>• All task comments</li>
            <li>• All channel links (channels themselves will remain)</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Note: Related assets and meetings will remain, only the links will
            be removed.
          </p>
        </div>
        <p className="text-destructive font-semibold">
          ⚠️ This action CANNOT be undone.
        </p>
      </ConfirmDeleteDialog>
    </>
  );
}
