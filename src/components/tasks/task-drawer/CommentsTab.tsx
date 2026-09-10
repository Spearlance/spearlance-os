import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MentionTextarea } from "../MentionTextarea";

interface CommentsTabProps {
  comments: any[];
  newComment: string;
  setNewComment: (value: string) => void;
  handleAddComment: () => void;
  users: any[];
  renderCommentText: (text: string) => React.ReactNode;
}

export function CommentsTab({
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  users,
  renderCommentText,
}: CommentsTabProps) {
  return (
    <>
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {comments.map((comment) => {
            // user_id is null for system comments (e.g. the QA reaper).
            const isSystem = !comment.user_id;
            const authorName = isSystem ? "QA system" : comment.profiles?.name;
            return (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={isSystem ? "bg-muted text-muted-foreground text-[10px]" : undefined}>
                  {isSystem ? "QA" : comment.profiles?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={isSystem ? "font-medium text-sm text-muted-foreground" : "font-medium text-sm"}>{authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{renderCommentText(comment.body)}</p>
              </div>
            </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="space-y-2 mt-4 pt-4 border-t">
        <MentionTextarea
          placeholder="Add a comment... (type @ to mention someone)"
          value={newComment}
          onChange={setNewComment}
          users={users}
          rows={3}
        />
        <Button onClick={handleAddComment}>Add Comment</Button>
      </div>
    </>
  );
}
