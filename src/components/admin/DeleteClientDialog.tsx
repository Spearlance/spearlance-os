import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

interface DeleteClientDialogProps {
  client: {
    id: string;
    name: string;
    domain?: string;
    billing_method?: string;
    subscription_status?: string;
    stripe_subscription_id?: string;
  };
  assignedUsers: Array<{ id: string; name: string }>;
  onConfirm: () => Promise<void>;
}

export function DeleteClientDialog({
  client,
  assignedUsers,
  onConfirm,
}: DeleteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const assignedUsersList =
    assignedUsers.length > 0
      ? assignedUsers.map((u) => u.name).join(", ")
      : "None";

  const hasActiveSubscription =
    !!client.stripe_subscription_id &&
    client.subscription_status === "active";

  const handleConfirm = async () => {
    if (hasActiveSubscription) return;
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
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        title="Delete Client Account"
        description="This action cannot be undone."
        confirmText="Delete Client"
        loading={loading}
        requireTypedConfirm={true}
      >
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">
            ⚠️ Warning: This action cannot be undone!
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <strong>Client:</strong> {client.name}
            </p>
            {client.domain && (
              <p>
                <strong>Domain:</strong> {client.domain}
              </p>
            )}
            <p>
              <strong>Assigned Users:</strong> {assignedUsersList}
            </p>
            {client.billing_method && (
              <p>
                <strong>Billing:</strong> {client.billing_method}
              </p>
            )}
          </div>
        </div>

        {hasActiveSubscription && (
          <div className="rounded-lg border border-warning bg-warning/10 p-4">
            <p className="font-semibold text-warning">
              💳 Active Stripe Subscription Detected
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This client has an active Stripe subscription. Please cancel it
              before deleting the account to avoid billing issues.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Deleting this client will permanently remove:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>All client data and settings</li>
            <li>Associated tasks, assets, and reports</li>
            <li>Marketing channels and campaigns</li>
            <li>Social media posts and schedules</li>
            <li>Communication logs and tickets</li>
            <li>User associations (users will be unassigned)</li>
          </ul>
        </div>
      </ConfirmDeleteDialog>
    </>
  );
}
