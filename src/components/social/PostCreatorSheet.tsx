import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PostCreator } from "./PostCreator";

interface PostCreatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function PostCreatorSheet({ open, onOpenChange, onComplete }: PostCreatorSheetProps) {
  const handleComplete = () => {
    onComplete?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Your Post</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <PostCreator onComplete={handleComplete} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
