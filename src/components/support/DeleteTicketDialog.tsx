import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Trash2 } from "lucide-react";

interface DeleteTicketDialogProps {
  ticketTitle: string;
  ticketId: string;
  trigger?: React.ReactNode;
}

export function DeleteTicketDialog({ ticketTitle, ticketId, trigger }: DeleteTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;

    setLoading(true);
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Error deleting ticket",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Ticket deleted successfully",
      description: "This action will not affect your support metrics.",
    });

    setOpen(false);
    navigate("/support");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Ticket
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete the following ticket:
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="font-medium text-sm">{ticketTitle}</p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The ticket and all its data</li>
              <li>All messages and replies</li>
              <li>Related notifications</li>
            </ul>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-900 dark:text-yellow-200">
              <strong>Note:</strong> This action will not affect your support speed or performance metrics. 
              Use this only for tickets created by mistake.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>DELETE</strong> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
        </div>

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
            {loading ? "Deleting..." : "Delete Ticket"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
