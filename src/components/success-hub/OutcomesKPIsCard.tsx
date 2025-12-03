import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Minus, Plus, Trash2, Edit2 } from "lucide-react";
import { BusinessOutcome, KPI } from "@/hooks/useSuccessHub";

interface OutcomesKPIsCardProps {
  outcomes: BusinessOutcome[];
  kpis: KPI[];
  onUpdate: (outcomes: BusinessOutcome[], kpis: KPI[]) => void;
}

export function OutcomesKPIsCard({ outcomes, kpis, onUpdate }: OutcomesKPIsCardProps) {
  const [editing, setEditing] = useState(false);
  const [localOutcomes, setLocalOutcomes] = useState<BusinessOutcome[]>(outcomes);
  const [localKpis, setLocalKpis] = useState<KPI[]>(kpis);

  const handleStartEdit = () => {
    setLocalOutcomes(outcomes);
    setLocalKpis(kpis);
    setEditing(true);
  };

  const handleSave = () => {
    onUpdate(localOutcomes, localKpis);
    setEditing(false);
  };

  const handleCancel = () => {
    setLocalOutcomes(outcomes);
    setLocalKpis(kpis);
    setEditing(false);
  };

  const addOutcome = () => {
    if (localOutcomes.length >= 3) return;
    setLocalOutcomes([...localOutcomes, { id: crypto.randomUUID(), title: '' }]);
  };

  const removeOutcome = (id: string) => {
    setLocalOutcomes(localOutcomes.filter(o => o.id !== id));
  };

  const addKpi = () => {
    if (localKpis.length >= 5) return;
    setLocalKpis([...localKpis, { 
      id: crypto.randomUUID(), 
      name: '', 
      currentValue: '', 
      status: 'green' 
    }]);
  };

  const removeKpi = (id: string) => {
    setLocalKpis(localKpis.filter(k => k.id !== id));
  };

  const getTrendIcon = (change?: number) => {
    if (change === undefined || change === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Outcomes & KPIs
            <Badge variant="outline" className="text-xs font-normal">Persistent</Badge>
          </CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={handleStartEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Business Outcomes */}
        <div>
          <h4 className="text-sm font-medium mb-2">Business Outcomes</h4>
          {editing ? (
            <div className="space-y-2">
              {localOutcomes.map((outcome, idx) => (
                <div key={outcome.id} className="flex gap-2">
                  <Input
                    placeholder={`Outcome ${idx + 1}`}
                    value={outcome.title}
                    onChange={(e) => {
                      const updated = [...localOutcomes];
                      updated[idx] = { ...outcome, title: e.target.value };
                      setLocalOutcomes(updated);
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeOutcome(outcome.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {localOutcomes.length < 3 && (
                <Button variant="outline" size="sm" onClick={addOutcome}>
                  <Plus className="h-4 w-4 mr-1" /> Add Outcome
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {outcomes.length > 0 ? (
                outcomes.map((outcome) => (
                  <Badge key={outcome.id} variant="secondary">{outcome.title}</Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No outcomes defined</p>
              )}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div>
          <h4 className="text-sm font-medium mb-2">Key Performance Indicators</h4>
          {editing ? (
            <div className="space-y-3">
              {localKpis.map((kpi, idx) => (
                <div key={kpi.id} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="KPI Name"
                      value={kpi.name}
                      onChange={(e) => {
                        const updated = [...localKpis];
                        updated[idx] = { ...kpi, name: e.target.value };
                        setLocalKpis(updated);
                      }}
                    />
                    <Input
                      placeholder="Current Value"
                      value={kpi.currentValue}
                      onChange={(e) => {
                        const updated = [...localKpis];
                        updated[idx] = { ...kpi, currentValue: e.target.value };
                        setLocalKpis(updated);
                      }}
                    />
                  </div>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={kpi.status}
                    onChange={(e) => {
                      const updated = [...localKpis];
                      updated[idx] = { ...kpi, status: e.target.value as 'green' | 'yellow' | 'red' };
                      setLocalKpis(updated);
                    }}
                  >
                    <option value="green">🟢</option>
                    <option value="yellow">🟡</option>
                    <option value="red">🔴</option>
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => removeKpi(kpi.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {localKpis.length < 5 && (
                <Button variant="outline" size="sm" onClick={addKpi}>
                  <Plus className="h-4 w-4 mr-1" /> Add KPI
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {kpis.length > 0 ? (
                kpis.map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(kpi.status)}`} />
                      <span className="text-sm font-medium">{kpi.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{kpi.currentValue}</span>
                      {getTrendIcon(kpi.change)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No KPIs defined</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
