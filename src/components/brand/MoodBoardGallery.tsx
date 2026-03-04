import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface MoodBoardGalleryProps {
  moodBoards: any[];
  onRefresh: () => void;
}

export default function MoodBoardGallery({ moodBoards, onRefresh }: MoodBoardGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mood_boards")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Success", { description: "Mood board deleted successfully" });

      onRefresh();
    } catch (error: any) {
      toast.error("Error", { description: "Failed to delete mood board" });
    }
  };

  const handleImageClick = (board: any, imageIndex: number) => {
    setSelectedBoard(board);
    setSelectedImage(board.generated_images[imageIndex]);
    setCurrentImageIndex(imageIndex);
  };

  const handleNextImage = () => {
    if (!selectedBoard) return;
    const nextIndex = (currentImageIndex + 1) % selectedBoard.generated_images.length;
    setCurrentImageIndex(nextIndex);
    setSelectedImage(selectedBoard.generated_images[nextIndex]);
  };

  const handlePrevImage = () => {
    if (!selectedBoard) return;
    const prevIndex = (currentImageIndex - 1 + selectedBoard.generated_images.length) % selectedBoard.generated_images.length;
    setCurrentImageIndex(prevIndex);
    setSelectedImage(selectedBoard.generated_images[prevIndex]);
  };

  const handleCloseDialog = () => {
    setSelectedImage(null);
    setSelectedBoard(null);
    setCurrentImageIndex(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      
      if (e.key === "ArrowLeft") {
        handlePrevImage();
      } else if (e.key === "ArrowRight") {
        handleNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, currentImageIndex, selectedBoard]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {moodBoards.map((board) => (
        <Card key={board.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-video bg-muted">
              {board.generated_images && board.generated_images.length > 0 ? (
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                  {board.generated_images.slice(0, 4).map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className="bg-cover bg-center cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundImage: `url(${img})` }}
                      onClick={() => handleImageClick(board, idx)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Sparkles className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{board.title}</h3>
                  {board.is_ai_generated && (
                    <Badge variant="secondary" className="mt-1">
                      AI Generated
                    </Badge>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Mood Board?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the mood board.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(board.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {board.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {board.description}
                </p>
              )}

              {board.inspiration_keywords && board.inspiration_keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {board.inspiration_keywords.slice(0, 3).map((keyword: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar className="h-3 w-3" />
                {format(new Date(board.created_at), "MMM d, yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={selectedImage !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-4xl p-0">
          <DialogTitle className="sr-only">Mood Board Image Gallery</DialogTitle>
          <div className="relative">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt={`Mood board image ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
            
            {selectedBoard && selectedBoard.generated_images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            {selectedBoard && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} of {selectedBoard.generated_images.length}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 hover:bg-background"
              onClick={handleCloseDialog}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
