import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BlogCreationWizard } from "./BlogCreationWizard";

interface BlogCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  creationType: 'single' | 'from-topic';
}

export function BlogCreationDialog({ 
  open, 
  onOpenChange, 
  onComplete,
  creationType 
}: BlogCreationDialogProps) {
  const handleComplete = () => {
    onComplete?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {creationType === 'single' ? 'Create Blog Post' : 'Generate from Topic'}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-6">
          <BlogCreationWizard onComplete={handleComplete} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
