import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Send } from "lucide-react";
import { format } from "date-fns";

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: {
    name: string;
  };
}

interface CommentsTabProps {
  comments: Comment[];
  newComment: string;
  setNewComment: (value: string) => void;
  onAddComment: () => void;
}

export const CommentsTab = ({
  comments,
  newComment,
  setNewComment,
  onAddComment,
}: CommentsTabProps) => {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <Label>Add Comment</Label>
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Leave a comment for your team..."
          rows={3}
        />
        <Button onClick={onAddComment} disabled={!newComment.trim()}>
          <Send className="h-4 w-4 mr-2" />
          Post Comment
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Start the conversation!
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium">{comment.profiles.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), "MMM d, h:mm a")}
                </p>
              </div>
              <p className="text-sm">{comment.comment_text}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
