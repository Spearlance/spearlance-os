import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BusinessOutcome, KPI } from "@/hooks/useSuccessHub";
import { cn } from "@/lib/utils";

interface OutcomesKPIsCardProps {
  outcomes: BusinessOutcome[];
  kpis: KPI[];
  onUpdate: (outcomes: BusinessOutcome[], kpis: KPI[]) => void;
}

export function OutcomesKPIsCard({ outcomes, kpis, onUpdate }: OutcomesKPIsCardProps) {
  const [editing, setEditing] = useState(false);
  const [localOutcomes, setLocalOutcomes] = useState(outcomes);
  const [localKpis, setLocalKpis] = useState(kpis);

  const handleSave = () => {
    onUpdate(localOutcomes, localKpis);
    setEditing(false);
  };

  const addOutcome = () => {
    setLocalOutcomes([...localOutcomes, { id: crypto.randomUUID(), title: '', description: '' }]);
  };

  const addKpi = () => {
    setLocalKpis([...localKpis, { 
      id: crypto.randomUUID(), 
      name: '', 
      currentValue: '', 
      status: 'green' 
    }]);
  };

  const getTrendIcon = (change?: number) => {
    if (change === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const statusColors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Outcomes & KPIs</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editing ? handleSave() : setEditing(true)}
        >
          {editing ? 'Save' : <Pencil className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Outcomes */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Business Outcomes</h4>
          {editing ? (
            <div className="space-y-2">
              {localOutcomes.map((outcome, idx) => (
                <div key={outcome.id} className="flex gap-2">
                  <Input
                    value={outcome.title}
                    onChange={(e) => {
                      const updated = [...localOutcomes];
                      updated[idx].title = e.target.value;
                      setLocalOutcomes(updated);
                    }}
                    placeholder="e.g., Increase booked calls by 20%"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocalOutcomes(localOutcomes.filter((_, i) => i !== idx))}
                  >
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
            <div className="space-y-2">
              {outcomes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No outcomes defined yet</p>
              ) : (
                outcomes.map((outcome) => (
                  <div key={outcome.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-normal">
                      {outcome.title}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Key Performance Indicators</h4>
          {editing ? (
            <div className="space-y-3">
              {localKpis.map((kpi, idx) => (
                <div key={kpi.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={kpi.name}
                      onChange={(e) => {
                        const updated = [...localKpis];
                        updated[idx].name = e.target.value;
                        setLocalKpis(updated);
                      }}
                      placeholder="KPI Name"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={kpi.currentValue}
                        onChange={(e) => {
                          const updated = [...localKpis];
                          updated[idx].currentValue = e.target.value;
                          setLocalKpis(updated);
                        }}
                        placeholder="Current Value"
                        className="w-32"
                      />
                      <select
                        value={kpi.status}
                        onChange={(e) => {
                          const updated = [...localKpis];
                          updated[idx].status = e.target.value as 'green' | 'yellow' | 'red';
                          setLocalKpis(updated);
                        }}
                        className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="green">Green</option>
                        <option value="yellow">Yellow</option>
                        <option value="red">Red</option>
                      </select>
                    </div>
                    {(kpi.status === 'yellow' || kpi.status === 'red') && (
                      <Input
                        value={kpi.whyNote || ''}
                        onChange={(e) => {
                          const updated = [...localKpis];
                          updated[idx].whyNote = e.target.value;
                          setLocalKpis(updated);
                        }}
                        placeholder="Why is this yellow/red?"
                      />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocalKpis(localKpis.filter((_, i) => i !== idx))}
                  >
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
            <div className="space-y-3">
              {kpis.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No KPIs defined yet</p>
              ) : (
                kpis.map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className={cn("w-2 h-2 rounded-full", statusColors[kpi.status])} />
                      <span className="font-medium">{kpi.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold">{kpi.currentValue}</span>
                      {getTrendIcon(kpi.change)}
                      {kpi.change !== undefined && (
                        <span className={cn(
                          "text-sm",
                          kpi.change > 0 ? "text-emerald-500" : kpi.change < 0 ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {kpi.change > 0 ? '+' : ''}{kpi.change}%
                        </span>
                      )}
                    </div>
                    {kpi.whyNote && (kpi.status === 'yellow' || kpi.status === 'red') && (
                      <p className="text-xs text-muted-foreground ml-5">{kpi.whyNote}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
