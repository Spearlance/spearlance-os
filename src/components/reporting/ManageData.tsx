import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { channelLabel } from "./ReportingDashboard";
import {
  deleteLead,
  deleteMetric,
  fetchLeads,
  fetchMetricDefinitions,
  fetchMetrics,
  insertLead,
  insertMetricDefinition,
  updateLead,
  upsertMetric,
  type LeadRow,
  type MetricRow,
} from "@/lib/reportingApi";
import type { MetricDefinition } from "@/lib/metricSeries";

// Key derived from the label ("Yelp Page Views" -> yelp_page_views); editable
// before saving, immutable after (it's the PK the data rows reference).
const slugifyMetricKey = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const EMPTY_DEF = { label: "", metric: "", metricTouched: false, unit: "", family: "", description: "" };

const STATUSES = ["new", "mql", "sql", "disqualified"] as const;
const CHANNELS = [
  "website", "google_ads", "facebook_ads", "microsoft_ads",
  "email", "phone", "organic", "referral",
] as const;
const NONE = "__none__";

const statusVariant = (s: string) =>
  s === "sql" ? "default" : s === "disqualified" ? "destructive" : s === "mql" ? "secondary" : "outline";

interface ManageDataProps {
  clientId: string;
  from: string;
  to: string;
  onChanged: () => void;
}

export function ManageData({ clientId, from, to, onChanged }: ManageDataProps) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "", email: "", phone: "", message: "", channel: NONE,
    status: "mql", occurred_at: new Date().toISOString().slice(0, 10),
  });
  const [defs, setDefs] = useState<MetricDefinition[]>([]);
  const [newMetric, setNewMetric] = useState({
    metric_date: new Date().toISOString().slice(0, 10), metric: "", value: "",
  });
  const [defOpen, setDefOpen] = useState(false);
  const [defBusy, setDefBusy] = useState(false);
  const [newDef, setNewDef] = useState(EMPTY_DEF);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, m, d] = await Promise.all([
        fetchLeads(clientId, from, to),
        fetchMetrics(clientId, from, to),
        fetchMetricDefinitions(),
      ]);
      setLeads(l);
      setMetrics(m);
      setDefs(d);
    } catch (error: any) {
      toast.error("Failed to load data", { description: error?.message });
    } finally {
      setLoading(false);
    }
  }, [clientId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    load();
    onChanged();
  };

  const activeDefs = defs.filter((d) => d.is_active);
  const defMap = new Map(defs.map((d) => [d.metric, d]));

  const patchLead = async (id: string, patch: Partial<LeadRow>, message: string) => {
    try {
      await updateLead(id, patch);
      toast.success(message);
      changed();
    } catch (error: any) {
      toast.error("Update failed", { description: error?.message });
    }
  };

  const removeLead = async (id: string) => {
    setConfirmDelete(null);
    try {
      await deleteLead(id);
      toast.success("Lead deleted");
      changed();
    } catch (error: any) {
      toast.error("Delete failed", { description: error?.message });
    }
  };

  const submitNewLead = async () => {
    if (!newLead.name && !newLead.email && !newLead.phone) {
      toast.error("Add at least a name, email, or phone");
      return;
    }
    setAddBusy(true);
    try {
      await insertLead(clientId, {
        ...newLead,
        channel: newLead.channel === NONE ? null : newLead.channel,
      });
      toast.success("Lead added");
      setAddOpen(false);
      setNewLead({
        name: "", email: "", phone: "", message: "", channel: NONE,
        status: "mql", occurred_at: new Date().toISOString().slice(0, 10),
      });
      changed();
    } catch (error: any) {
      toast.error("Failed to add lead", { description: error?.message });
    } finally {
      setAddBusy(false);
    }
  };

  const submitNewMetric = async () => {
    const value = Number(newMetric.value);
    if (!newMetric.metric || !Number.isFinite(value)) {
      toast.error("Pick a metric and enter a numeric value");
      return;
    }
    try {
      await upsertMetric(clientId, newMetric.metric_date, newMetric.metric, value);
      toast.success("Metric saved");
      setNewMetric({ ...newMetric, value: "" });
      changed();
    } catch (error: any) {
      toast.error("Failed to save metric", { description: error?.message });
    }
  };

  const submitNewDef = async () => {
    const metric = slugifyMetricKey(newDef.metric);
    if (!newDef.label.trim() || !metric || !newDef.unit.trim()) {
      toast.error("Label, key, and unit are required");
      return;
    }
    setDefBusy(true);
    try {
      await insertMetricDefinition({
        metric,
        label: newDef.label.trim(),
        unit: newDef.unit.trim().toLowerCase(),
        family: newDef.family.trim().toLowerCase() || null,
        description: newDef.description.trim() || null,
        display_order: Math.max(0, ...defs.map((d) => d.display_order)) + 10,
      });
      toast.success(`Metric type "${newDef.label.trim()}" created`);
      setDefOpen(false);
      setNewDef(EMPTY_DEF);
      setNewMetric((m) => ({ ...m, metric }));
      await load();
    } catch (error: any) {
      toast.error(
        error?.code === "23505" ? `A metric with key "${metric}" already exists` : "Failed to create metric type",
        { description: error?.code === "23505" ? undefined : error?.message },
      );
    } finally {
      setDefBusy(false);
    }
  };

  const removeMetric = async (id: string) => {
    setConfirmDelete(null);
    try {
      await deleteMetric(id);
      toast.success("Metric deleted");
      changed();
    } catch (error: any) {
      toast.error("Delete failed", { description: error?.message });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Manage data</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal only — edits here update the dashboard and the public share link immediately
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leads">
          <TabsList className="mb-3">
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="metrics">Metrics ({metrics.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add lead</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add lead manually</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Date</Label>
                        <Input type="date" value={newLead.occurred_at}
                          onChange={(e) => setNewLead({ ...newLead, occurred_at: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Email</Label>
                        <Input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Phone</Label>
                        <Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Channel</Label>
                        <Select value={newLead.channel} onValueChange={(channel) => setNewLead({ ...newLead, channel })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Unattributed</SelectItem>
                            {CHANNELS.map((c) => (
                              <SelectItem key={c} value={c}>{channelLabel(c)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Status</Label>
                        <Select value={newLead.status} onValueChange={(status) => setNewLead({ ...newLead, status })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Notes</Label>
                      <Textarea rows={2} value={newLead.message}
                        onChange={(e) => setNewLead({ ...newLead, message: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitNewLead} disabled={addBusy}>
                      {addBusy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Add lead
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{lead.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {[lead.email, lead.phone].filter(Boolean).join(" · ") || "no contact info"}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{lead.source}</Badge></TableCell>
                      <TableCell>
                        <Select
                          value={lead.channel ?? NONE}
                          onValueChange={(channel) =>
                            patchLead(lead.id, { channel: channel === NONE ? null : channel }, "Channel updated")}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Unattributed</SelectItem>
                            {[...new Set([...CHANNELS, ...(lead.channel ? [lead.channel] : [])])].map((c) => (
                              <SelectItem key={c} value={c}>{channelLabel(c)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(status) =>
                            patchLead(lead.id, { status, status_reason: "manual override" }, `Marked ${status.toUpperCase()}`)}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <Badge variant={statusVariant(lead.status)} className="text-xs pointer-events-none">
                              {lead.status.toUpperCase()}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {confirmDelete === lead.id ? (
                          <Button size="sm" variant="destructive" className="h-8 text-xs"
                            onClick={() => removeLead(lead.id)} onBlur={() => setConfirmDelete(null)}>
                            Confirm
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => setConfirmDelete(lead.id)} title="Delete lead">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {leads.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                        No leads in this date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {leads.length === 100 && (
              <p className="text-xs text-muted-foreground">Showing the most recent 100 — narrow the date range to see older leads.</p>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" className="h-8 w-[150px]" value={newMetric.metric_date}
                  onChange={(e) => setNewMetric({ ...newMetric, metric_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Metric</Label>
                <Select value={newMetric.metric || undefined}
                  onValueChange={(metric) => setNewMetric({ ...newMetric, metric })}>
                  <SelectTrigger className="h-8 w-[220px]">
                    <SelectValue placeholder={activeDefs.length ? "Select metric" : "No metrics defined"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDefs.map((d) => (
                      <SelectItem key={d.metric} value={d.metric}>
                        {d.label} ({d.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={defOpen} onOpenChange={(open) => { setDefOpen(open); if (!open) setNewDef(EMPTY_DEF); }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> New metric type
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>New metric type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Label</Label>
                        <Input value={newDef.label} placeholder="Yelp Page Views"
                          onChange={(e) => setNewDef((d) => ({
                            ...d,
                            label: e.target.value,
                            metric: d.metricTouched ? d.metric : slugifyMetricKey(e.target.value),
                          }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Key</Label>
                        <Input value={newDef.metric} placeholder="yelp_page_views"
                          onChange={(e) => setNewDef((d) => ({
                            ...d,
                            metric: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                            metricTouched: true,
                          }))} />
                        <p className="text-[11px] text-muted-foreground">
                          Stored identifier — can't be changed after data is logged against it.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Unit</Label>
                        <Input value={newDef.unit} placeholder="views" list="metric-unit-options"
                          onChange={(e) => setNewDef((d) => ({ ...d, unit: e.target.value }))} />
                        <datalist id="metric-unit-options">
                          {[...new Set([...defs.map((d) => d.unit), "calls", "clicks", "emails", "views", "sessions", "leads", "dollars"])].map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <Label>Family <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input value={newDef.family} placeholder="calls" list="metric-family-options"
                          onChange={(e) => setNewDef((d) => ({ ...d, family: e.target.value }))} />
                        <datalist id="metric-family-options">
                          {[...new Set(defs.map((d) => d.family).filter(Boolean))].map((f) => (
                            <option key={f as string} value={f as string} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-1">
                      Metrics in the same family are grouped on the dashboard, and only totaled
                      together when their units match.
                    </p>
                    <div className="space-y-1">
                      <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Textarea rows={2} value={newDef.description}
                        placeholder="What this counts and where it comes from"
                        onChange={(e) => setNewDef((d) => ({ ...d, description: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitNewDef} disabled={defBusy}>
                      {defBusy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Create metric type
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input type="number" className="h-8 w-[100px]" value={newMetric.value}
                  onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })} />
              </div>
              <Button size="sm" className="h-8" onClick={submitNewMetric}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <p className="text-xs text-muted-foreground pb-1.5">
                Saving an existing date + metric overwrites its value. New metric types are added in
                reporting.metric_definitions — no code change needed.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m) => {
                    const def = defMap.get(m.metric);
                    return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap">{m.metric_date}</TableCell>
                      <TableCell className="text-sm">
                        {def ? (
                          <>
                            {def.label}{" "}
                            <span className="text-xs text-muted-foreground">({def.unit})</span>
                          </>
                        ) : (
                          <>
                            {m.metric}{" "}
                            <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-500"
                              title="No entry in reporting.metric_definitions — add one to set a label and unit.">
                              undefined
                            </Badge>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{Number(m.value)}</TableCell>
                      <TableCell>
                        {confirmDelete === m.id ? (
                          <Button size="sm" variant="destructive" className="h-8 text-xs"
                            onClick={() => removeMetric(m.id)} onBlur={() => setConfirmDelete(null)}>
                            Confirm
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => setConfirmDelete(m.id)} title="Delete metric">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {metrics.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                        No metrics in this date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
