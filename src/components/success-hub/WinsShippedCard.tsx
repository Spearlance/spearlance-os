import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus, Trophy, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ManualWin } from "@/hooks/useSuccessHub";
import { AddWinDialog } from "./AddWinDialog";

interface WinsShippedCardProps {
  completedTasks: any[];
  manualWins: ManualWin[];
  onAddWin: (win: ManualWin) => void;
  onRemoveWin: (winId: string) => void;
}

export function WinsShippedCard({ completedTasks, manualWins, onAddWin, onRemoveWin }: WinsShippedCardProps) {
  const [showAddWin, setShowAddWin] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Wins & Shipped
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAddWin(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Win
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Wins */}
          {manualWins.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Wins</h4>
              <div className="space-y-2">
                {manualWins.map((win) => (
                  <div key={win.id} className="flex items-start justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <Trophy className="h-4 w-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{win.title}</p>
                        {win.description && (
                          <p className="text-xs text-muted-foreground mt-1">{win.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveWin(win.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Completed Work (Last 7 Days)
            </h4>
            {completedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No tasks completed this week</p>
            ) : (
              <div className="space-y-2">
                {completedTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {format(new Date(task.updated_at), 'MMM d')}
                    </Badge>
                  </div>
                ))}
                {completedTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{completedTasks.length - 5} more completed
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddWinDialog
        open={showAddWin}
        onOpenChange={setShowAddWin}
        onAdd={onAddWin}
      />
    </>
  );
}
