import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

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
  loading,
}: DeleteAvatarDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Avatar?"
      description={`This will permanently delete "${avatarName}" and cannot be undone.`}
      loading={loading}
    />
  );
}
