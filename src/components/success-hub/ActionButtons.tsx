import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Plus, 
  Send,
  Calendar
} from "lucide-react";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { LogCommunicationDialog } from "@/components/communications/LogCommunicationDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";

interface ActionButtonsProps {
  clientId: string;
  onRefresh: () => void;
}

export function ActionButtons({ clientId, onRefresh }: ActionButtonsProps) {
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showCommDialog, setShowCommDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  const handleDialogClose = (setter: (v: boolean) => void) => (open: boolean) => {
    setter(open);
    if (!open) {
      onRefresh();
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowMeetingDialog(true)}>
          <Calendar className="h-4 w-4 mr-2" />
          Log Meeting Notes
        </Button>
        
        <Button variant="outline" onClick={() => setShowCommDialog(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Log Communication
        </Button>
        
        <Button variant="outline" onClick={() => setShowTaskDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
        
        <Button variant="outline" disabled>
          <Send className="h-4 w-4 mr-2" />
          Send Weekly Update
        </Button>
      </div>

      <CreateMeetingDialog
        open={showMeetingDialog}
        onOpenChange={handleDialogClose(setShowMeetingDialog)}
      />

      <LogCommunicationDialog
        open={showCommDialog}
        onOpenChange={handleDialogClose(setShowCommDialog)}
      />

      <CreateTaskDialog
        open={showTaskDialog}
        onOpenChange={handleDialogClose(setShowTaskDialog)}
        onSuccess={onRefresh}
      />
    </>
  );
}
