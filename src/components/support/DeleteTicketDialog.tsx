import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

interface DeleteTicketDialogProps {
  ticketTitle: string;
  ticketId: string;
  trigger?: React.ReactNode;
}

export function DeleteTicketDialog({ ticketTitle, ticketId, trigger }: DeleteTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId);

    if (error) {
      toast.error("Error deleting ticket", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success("Ticket deleted successfully", { description: "This action will not affect your support metrics." });

    setOpen(false);
    navigate("/support");
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Ticket
          </Button>
        )}
      </span>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        title="Delete Ticket"
        description="You are about to permanently delete the following ticket:"
        confirmText="Delete Ticket"
        loading={loading}
        requireTypedConfirm={true}
      >
        <div className="p-3 bg-muted rounded-md">
          <p className="font-medium text-sm">{ticketTitle}</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">
            This will permanently delete:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>The ticket and all its data</li>
            <li>All messages and replies</li>
            <li>Related notifications</li>
          </ul>
        </div>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-900 dark:text-yellow-200">
            <strong>Note:</strong> This action will not affect your support
            speed or performance metrics. Use this only for tickets created by
            mistake.
          </p>
        </div>
      </ConfirmDeleteDialog>
    </>
  );
}
