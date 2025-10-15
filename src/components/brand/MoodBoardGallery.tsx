import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";
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

interface MoodBoardGalleryProps {
  moodBoards: any[];
  onRefresh: () => void;
}

export default function MoodBoardGallery({ moodBoards, onRefresh }: MoodBoardGalleryProps) {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mood_boards")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mood board deleted successfully"
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error deleting mood board:", error);
      toast({
        title: "Error",
        description: "Failed to delete mood board",
        variant: "destructive"
      });
    }
  };

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
                      className="bg-cover bg-center"
                      style={{ backgroundImage: `url(${img})` }}
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
    </div>
  );
}
