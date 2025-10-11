import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

interface ViewScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fmmUsername?: string;
  fmmEventTypeId?: string;
}

export function ViewScheduleDialog({
  open,
  onOpenChange,
  fmmUsername,
  fmmEventTypeId,
}: ViewScheduleDialogProps) {
  const [embedUrl, setEmbedUrl] = useState<string>("");

  useEffect(() => {
    if (open && fmmUsername && fmmEventTypeId) {
      // Construct Cal.com embed URL with view-only mode
      const calUrl = `https://cal.com/${fmmUsername}/${fmmEventTypeId}?embed=true&hideEventTypeDetails=false`;
      setEmbedUrl(calUrl);
    }
  }, [open, fmmUsername, fmmEventTypeId]);

  if (!fmmUsername || !fmmEventTypeId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>View Schedule</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Calendar viewing is not configured for this account.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>View Schedule</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0 rounded-lg"
            allow="payment"
          />
          <p className="text-sm text-muted-foreground mt-2">
            This is a read-only view of the schedule. Booking is not available.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
