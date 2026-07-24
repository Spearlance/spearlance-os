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
  fetchMetrics,
  insertLead,
  updateLead,
  upsertMetric,
  type LeadRow,
  type MetricRow,
} from "@/lib/reportingApi";

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
  const [newMetric, setNewMetric] = useState({
    metric_date: new Date().toISOString().slice(0, 10), metric: "duda_calls", value: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, m] = await Promise.all([
        fetchLeads(clientId, from, to),
        fetchMetrics(clientId, from, to),
      ]);
      setLeads(l);
      setMetrics(m);
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
    if (!newMetric.metric.trim() || !Number.isFinite(value)) {
      toast.error("Metric name and numeric value are required");
      return;
    }
    try {
      await upsertMetric(clientId, newMetric.metric_date, newMetric.metric.trim(), value);
      toast.success("Metric saved");
      setNewMetric({ ...newMetric, value: "" });
      changed();
    } catch (error: any) {
      toast.error("Failed to save metric", { description: error?.message });
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
                <Input className="h-8 w-[150px]" value={newMetric.metric} placeholder="duda_calls"
                  onChange={(e) => setNewMetric({ ...newMetric, metric: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input type="number" className="h-8 w-[100px]" value={newMetric.value}
                  onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })} />
              </div>
              <Button size="sm" className="h-8" onClick={submitNewMetric}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <p className="text-xs text-muted-foreground pb-1.5">
                Saving an existing date + metric overwrites its value.
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
                  {metrics.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap">{m.metric_date}</TableCell>
                      <TableCell className="text-sm">{m.metric}</TableCell>
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
                  ))}
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
