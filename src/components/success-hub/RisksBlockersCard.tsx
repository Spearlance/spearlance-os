import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Trash2, CheckCircle2, XCircle, Clock, FileQuestion } from "lucide-react";
import { RiskBlocker, NeedFromClient } from "@/hooks/useSuccessHub";
import { cn } from "@/lib/utils";

interface RisksBlockersCardProps {
  risksBlockers: RiskBlocker[];
  needsFromClient: NeedFromClient[];
  overdueTasks: any[];
  onUpdateRisks: (risks: RiskBlocker[]) => void;
  onUpdateNeeds: (needs: NeedFromClient[]) => void;
}

export function RisksBlockersCard({
  risksBlockers,
  needsFromClient,
  overdueTasks,
  onUpdateRisks,
  onUpdateNeeds,
}: RisksBlockersCardProps) {
  const [newRisk, setNewRisk] = useState("");
  const [newNeed, setNewNeed] = useState("");

  const addRisk = () => {
    if (!newRisk.trim()) return;
    onUpdateRisks([
      ...risksBlockers,
      {
        id: crypto.randomUUID(),
        title: newRisk.trim(),
        type: 'blocker',
        status: 'open',
      },
    ]);
    setNewRisk("");
  };

  const addNeed = () => {
    if (!newNeed.trim()) return;
    onUpdateNeeds([
      ...needsFromClient,
      {
        id: crypto.randomUUID(),
        title: newNeed.trim(),
        type: 'other',
        status: 'pending',
      },
    ]);
    setNewNeed("");
  };

  const toggleRiskStatus = (id: string) => {
    onUpdateRisks(
      risksBlockers.map((r) =>
        r.id === id ? { ...r, status: r.status === 'open' ? 'resolved' : 'open' } : r
      )
    );
  };

  const toggleNeedStatus = (id: string) => {
    onUpdateNeeds(
      needsFromClient.map((n) =>
        n.id === id ? { ...n, status: n.status === 'pending' ? 'received' : 'pending' } : n
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Risks & Blockers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-surfaced Red Flags */}
        {overdueTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
              <XCircle className="h-4 w-4" /> Red Flags
            </h4>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Clock className="h-4 w-4 text-red-500" />
                  <span className="text-sm flex-1">Overdue: {task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blockers */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Blockers</h4>
          <div className="space-y-2">
            {risksBlockers.filter(r => r.status === 'open').map((risk) => (
              <div key={risk.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleRiskStatus(risk.id)}
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </Button>
                <span className="text-sm flex-1">{risk.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onUpdateRisks(risksBlockers.filter(r => r.id !== risk.id))}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {risksBlockers.filter(r => r.status === 'resolved').length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Resolved</p>
                {risksBlockers.filter(r => r.status === 'resolved').map((risk) => (
                  <div key={risk.id} className="flex items-center gap-2 p-2 rounded-lg opacity-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm line-through">{risk.title}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Input
                value={newRisk}
                onChange={(e) => setNewRisk(e.target.value)}
                placeholder="Add a blocker..."
                onKeyDown={(e) => e.key === 'Enter' && addRisk()}
              />
              <Button variant="outline" size="icon" onClick={addRisk}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Needs from Client */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <FileQuestion className="h-4 w-4" /> Needs from Client
          </h4>
          <div className="space-y-2">
            {needsFromClient.filter(n => n.status === 'pending').map((need) => (
              <div key={need.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleNeedStatus(need.id)}
                >
                  <Clock className="h-4 w-4 text-blue-500" />
                </Button>
                <span className="text-sm flex-1">{need.title}</span>
                <Badge variant="secondary" className="text-xs capitalize">
                  {need.type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onUpdateNeeds(needsFromClient.filter(n => n.id !== need.id))}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {needsFromClient.filter(n => n.status === 'received').length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Received</p>
                {needsFromClient.filter(n => n.status === 'received').map((need) => (
                  <div key={need.id} className="flex items-center gap-2 p-2 rounded-lg opacity-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm line-through">{need.title}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Input
                value={newNeed}
                onChange={(e) => setNewNeed(e.target.value)}
                placeholder="Add a need from client..."
                onKeyDown={(e) => e.key === 'Enter' && addNeed()}
              />
              <Button variant="outline" size="icon" onClick={addNeed}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
