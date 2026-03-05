import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fmmUsername?: string;
  fmmEventTypeId?: string;
}

export function BookMeetingDialog({
  open,
  onOpenChange,
  fmmUsername,
  fmmEventTypeId,
}: BookMeetingDialogProps) {
  const [embedUrl, setEmbedUrl] = useState<string>("");

  useEffect(() => {
    if (open && fmmUsername && fmmEventTypeId) {
      // Construct Cal.com embed URL
      const calUrl = `https://cal.com/${fmmUsername}/${fmmEventTypeId}`;
      setEmbedUrl(calUrl);
    }
  }, [open, fmmUsername, fmmEventTypeId]);

  useEffect(() => {
    if (!open) return;

    // Listen for booking confirmation messages from Cal.com iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "booking:success") {
        toast.success("Meeting booked successfully", { description: "Your meeting has been scheduled." });
        onOpenChange(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, onOpenChange]);

  if (!fmmUsername || !fmmEventTypeId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Book Meeting</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Calendar booking is not configured for this account.
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
          <DialogTitle>Book Meeting</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0 rounded-lg"
            allow="payment"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
