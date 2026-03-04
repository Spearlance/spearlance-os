import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, RefreshCw, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface TaskRecommendation {
  title: string;
  description: string;
  source: string;
  priority: 'high' | 'normal' | 'low' | 'urgent';
  suggested_due_date: string;
  linked_entity_type: 'submission' | 'meeting' | 'communication' | 'social_post' | null;
  linked_entity_id: string | null;
}

interface RecommendedTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendations: TaskRecommendation[];
  clientId: string;
  onTaskAdded: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function RecommendedTasksDialog({
  open,
  onOpenChange,
  recommendations,
  clientId,
  onTaskAdded,
  onRefresh,
  isRefreshing
}: RecommendedTasksDialogProps) {
  const { toast } = useToast();
  const [addingTasks, setAddingTasks] = useState<string[]>([]);
  const [addingAll, setAddingAll] = useState(false);

  const handleAddTask = async (recommendation: TaskRecommendation, index: number) => {
    const taskId = `${index}`;
    setAddingTasks(prev => [...prev, taskId]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the "To Do" column ID
      const { data: toDoColumn } = await supabase
        .from('task_columns')
        .select('id')
        .eq('client_id', clientId)
        .eq('mapped_status', 'to_do')
        .limit(1)
        .single();

      const { error } = await supabase
        .from('tasks')
        .insert({
          client_id: clientId,
          title: recommendation.title,
          description: recommendation.description,
          status: 'to_do',
          priority: recommendation.priority,
          due_date: null,
          creator_user_id: user.id,
          assignee_user_id: null,
          column_id: toDoColumn?.id || null,
          metadata: {
            source: 'ai_recommendation',
            original_source: recommendation.source,
            linked_entity_type: recommendation.linked_entity_type,
            linked_entity_id: recommendation.linked_entity_id,
            suggested_due_date: recommendation.suggested_due_date
          }
        });
      
      if (error) throw error;
      
      toast({
        title: "Task added",
        description: recommendation.title
      });
      
      onTaskAdded();
      
    } catch (error) {
      toast({
        title: "Failed to add task",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setAddingTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleAddAllTasks = async () => {
    setAddingAll(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the "To Do" column ID
      const { data: toDoColumn } = await supabase
        .from('task_columns')
        .select('id')
        .eq('client_id', clientId)
        .eq('mapped_status', 'to_do')
        .limit(1)
        .single();

      const tasksToInsert = recommendations.map(rec => ({
        client_id: clientId,
        title: rec.title,
        description: rec.description,
        status: 'to_do' as const,
        priority: rec.priority,
        due_date: null,
        creator_user_id: user.id,
        assignee_user_id: null,
        column_id: toDoColumn?.id || null,
        metadata: {
          source: 'ai_recommendation',
          original_source: rec.source,
          linked_entity_type: rec.linked_entity_type,
          linked_entity_id: rec.linked_entity_id,
          suggested_due_date: rec.suggested_due_date
        }
      }));
      
      const { error } = await supabase
        .from('tasks')
        .insert(tasksToInsert);
      
      if (error) throw error;
      
      toast({
        title: "All tasks added",
        description: `${recommendations.length} tasks added to your board`
      });
      
      onTaskAdded();
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Failed to add tasks",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setAddingAll(false);
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'destructive';
      case 'normal':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatDueDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recommended Tasks
          </DialogTitle>
          <DialogDescription>
            {recommendations.length > 0
              ? `AI analyzed your recent activity and found ${recommendations.length} task${recommendations.length > 1 ? 's' : ''} you might want to add`
              : "No task recommendations at this time. Great job staying on top of everything!"}
          </DialogDescription>
        </DialogHeader>
        
        {recommendations.length > 0 ? (
          <>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {recommendations.map((rec, index) => (
                <Card key={index} className="border-l-4" style={{
                  borderLeftColor: rec.priority === 'urgent' || rec.priority === 'high' ? 'hsl(var(--destructive))' : 
                                   rec.priority === 'normal' ? 'hsl(var(--primary))' : 
                                   'hsl(var(--muted-foreground))'
                }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{rec.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          {rec.description}
                        </CardDescription>
                      </div>
                      <Badge variant={getPriorityVariant(rec.priority)} className="shrink-0">
                        {rec.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        📍 {rec.source}
                      </span>
                      <span>Due: {formatDueDate(rec.suggested_due_date)}</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleAddTask(rec, index)}
                      disabled={addingTasks.includes(`${index}`) || addingAll}
                    >
                      {addingTasks.includes(`${index}`) ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-3 w-3" />
                          Add to Tasks
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-between pt-4 border-t gap-2">
              <Button 
                variant="outline" 
                onClick={onRefresh}
                disabled={isRefreshing || addingAll}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={addingAll}
                >
                  Close
                </Button>
                <Button 
                  onClick={handleAddAllTasks}
                  disabled={addingAll || addingTasks.length > 0}
                >
                  {addingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add All ${recommendations.length} Tasks`
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No recommendations available right now.
            </p>
            <Button 
              variant="outline" 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="mt-4"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Again
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
