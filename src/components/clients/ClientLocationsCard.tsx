import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  DAY_KEYS,
  DAY_LABELS,
  EMPTY_LOCATION,
  formatAddress,
  formatHours,
  isHoursKnown,
  locationProblem,
  normalizeLocation,
  type ClientLocationInput,
  type DayKey,
  type HoursMap,
} from "@/lib/clientLocations";

type LocationRow = Database["public"]["Tables"]["client_locations"]["Row"];

interface ClientLocationsCardProps {
  clientId: string;
  /** Shown under the title; defaults to the NAP explanation. */
  description?: string;
}

const DEFAULT_WEEK: HoursMap = {
  mon: [{ open: "09:00", close: "17:00" }],
  tue: [{ open: "09:00", close: "17:00" }],
  wed: [{ open: "09:00", close: "17:00" }],
  thu: [{ open: "09:00", close: "17:00" }],
  fri: [{ open: "09:00", close: "17:00" }],
  sat: [],
  sun: [],
};

function rowToInput(row: LocationRow): ClientLocationInput {
  return {
    label: row.label,
    is_primary: row.is_primary,
    business_name: row.business_name,
    phone: row.phone,
    email: row.email,
    address_line1: row.address_line1,
    address_line2: row.address_line2,
    city: row.city,
    state: row.state,
    postal_code: row.postal_code,
    country: row.country,
    hours: ((row.hours && typeof row.hours === "object" && !Array.isArray(row.hours)) ? row.hours : {}) as HoursMap,
    hours_note: row.hours_note,
    google_place_id: row.google_place_id,
    gbp_location_id: row.gbp_location_id,
    notes: row.notes,
  };
}

/**
 * Canonical NAP per client location. What lives here is what the QA agent
 * compares a page's name / address / phone / hours against, so it should be
 * the record the client wants published everywhere, not whatever the site
 * currently says.
 */
export function ClientLocationsCard({ clientId, description }: ClientLocationsCardProps) {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; draft: ClientLocationInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<LocationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_locations")
      .select("*")
      .eq("client_id", clientId)
      .order("is_primary", { ascending: false })
      .order("label");
    if (error) toast.error("Couldn't load locations", { description: error.message });
    setRows(data ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => setEditing({ id: null, draft: { ...EMPTY_LOCATION, label: rows.length ? "" : "Main location" } });
  const openEdit = (row: LocationRow) => setEditing({ id: row.id, draft: rowToInput(row) });

  const save = async () => {
    if (!editing) return;
    const problem = locationProblem(editing.draft);
    if (problem) {
      toast.error("Can't save location", { description: problem });
      return;
    }
    setSaving(true);
    const n = normalizeLocation(editing.draft);
    const payload = {
      client_id: clientId,
      label: n.label,
      business_name: n.business_name,
      phone: n.phone,
      email: n.email,
      address_line1: n.address_line1,
      address_line2: n.address_line2,
      city: n.city,
      state: n.state,
      postal_code: n.postal_code,
      country: n.country,
      hours: n.hours as unknown as Json,
      hours_note: n.hours_note,
      google_place_id: n.google_place_id,
      gbp_location_id: n.gbp_location_id,
      notes: n.notes,
    };
    const { error } = editing.id
      ? await supabase.from("client_locations").update(payload).eq("id", editing.id)
      : await supabase.from("client_locations").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save location", { description: error.message });
      return;
    }
    toast.success(editing.id ? "Location updated" : "Location added");
    setEditing(null);
    load();
  };

  const makePrimary = async (row: LocationRow) => {
    const { error } = await supabase.rpc("client_locations_set_primary", { p_location: row.id });
    if (error) {
      toast.error("Couldn't set primary", { description: error.message });
      return;
    }
    toast.success(`${row.label} is now the primary location`);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("client_locations").delete().eq("id", deleting.id);
    if (error) {
      toast.error("Couldn't delete location", { description: error.message });
      return;
    }
    toast.success("Location removed");
    setDeleting(null);
    load();
  };

  const updateDraft = (patch: Partial<ClientLocationInput>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  const setDay = (day: DayKey, next: { open?: string; close?: string; closed?: boolean }) => {
    if (!editing) return;
    const hours: HoursMap = { ...editing.draft.hours };
    const current = hours[day]?.[0] ?? { open: "09:00", close: "17:00" };
    if (next.closed === true) hours[day] = [];
    else if (next.closed === false) hours[day] = [current];
    else hours[day] = [{ open: next.open ?? current.open, close: next.close ?? current.close }];
    updateDraft({ hours });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations
            </CardTitle>
            <CardDescription>
              {description ??
                "The name, address, phone and hours the business wants published everywhere. QA checks pages against the primary location."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No locations yet. Until one exists the QA agent can only report contact details as unverifiable.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const hoursLines = formatHours(row.hours as HoursMap);
              const address = formatAddress(row);
              return (
                <li key={row.id} className="rounded-md border p-3 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{row.label}</span>
                    {row.is_primary && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        <Star className="h-3 w-3 mr-1" /> primary
                      </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {!row.is_primary && (
                        <Button size="sm" variant="ghost" onClick={() => makePrimary(row)} title="Make primary">
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)} aria-label={`Edit ${row.label}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(row)} aria-label={`Delete ${row.label}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                    {row.business_name && (<><dt className="text-muted-foreground">Name</dt><dd>{row.business_name}</dd></>)}
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{row.phone || <span className="text-muted-foreground">not set</span>}</dd>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd>{address || <span className="text-muted-foreground">not set</span>}</dd>
                    {row.email && (<><dt className="text-muted-foreground">Email</dt><dd>{row.email}</dd></>)}
                    <dt className="text-muted-foreground">Hours</dt>
                    <dd>
                      {hoursLines.length ? (
                        <ul>{hoursLines.map((l) => <li key={l}>{l}</li>)}</ul>
                      ) : (
                        <span className="text-muted-foreground">unknown</span>
                      )}
                      {row.hours_note && <div className="text-xs text-muted-foreground">{row.hours_note}</div>}
                    </dd>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      {/* Add / edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && !saving && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit location" : "Add location"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="loc-label">Label</Label>
                  <Input id="loc-label" value={editing.draft.label} onChange={(e) => updateDraft({ label: e.target.value })} placeholder="Main location" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-name">Business name on the site</Label>
                  <Input id="loc-name" value={editing.draft.business_name ?? ""} onChange={(e) => updateDraft({ business_name: e.target.value })} placeholder="Defaults to the brand name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-phone">Phone</Label>
                  <Input id="loc-phone" value={editing.draft.phone ?? ""} onChange={(e) => updateDraft({ phone: e.target.value })} placeholder="(603) 555-0100" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-email">Email</Label>
                  <Input id="loc-email" type="email" value={editing.draft.email ?? ""} onChange={(e) => updateDraft({ email: e.target.value })} placeholder="office@client.com" />
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-1.5 col-span-4">
                  <Label htmlFor="loc-a1">Street address</Label>
                  <Input id="loc-a1" value={editing.draft.address_line1 ?? ""} onChange={(e) => updateDraft({ address_line1: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="loc-a2">Suite / unit</Label>
                  <Input id="loc-a2" value={editing.draft.address_line2 ?? ""} onChange={(e) => updateDraft({ address_line2: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-3">
                  <Label htmlFor="loc-city">City</Label>
                  <Input id="loc-city" value={editing.draft.city ?? ""} onChange={(e) => updateDraft({ city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-state">State</Label>
                  <Input id="loc-state" value={editing.draft.state ?? ""} onChange={(e) => updateDraft({ state: e.target.value })} placeholder="NH" maxLength={3} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-zip">ZIP</Label>
                  <Input id="loc-zip" value={editing.draft.postal_code ?? ""} onChange={(e) => updateDraft({ postal_code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-country">Country</Label>
                  <Input id="loc-country" value={editing.draft.country} onChange={(e) => updateDraft({ country: e.target.value })} maxLength={3} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Hours</Label>
                  {isHoursKnown(editing.draft.hours) ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => updateDraft({ hours: {} })}>Mark unknown</Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => updateDraft({ hours: { ...DEFAULT_WEEK } })}>Set hours</Button>
                  )}
                </div>
                {isHoursKnown(editing.draft.hours) ? (
                  <div className="rounded-md border divide-y">
                    {DAY_KEYS.map((day) => {
                      const iv = editing.draft.hours[day]?.[0];
                      const open = !!iv;
                      return (
                        <div key={day} className="grid grid-cols-[6.5rem_auto_1fr] items-center gap-3 px-3 py-1.5 text-sm">
                          <span>{DAY_LABELS[day]}</span>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Checkbox checked={open} onCheckedChange={(v) => setDay(day, { closed: v !== true })} /> open
                          </label>
                          {open ? (
                            <div className="flex items-center gap-2">
                              <Input type="time" value={iv.open} onChange={(e) => setDay(day, { open: e.target.value })} className="h-8 w-32" />
                              <span className="text-muted-foreground">to</span>
                              <Input type="time" value={iv.close} onChange={(e) => setDay(day, { close: e.target.value })} className="h-8 w-32" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Hours unknown. The agent will report hours checks as unverifiable.</p>
                )}
                <Input value={editing.draft.hours_note ?? ""} onChange={(e) => updateDraft({ hours_note: e.target.value })} placeholder="Hours note, e.g. Closed on federal holidays" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="loc-place">Google Place ID</Label>
                  <Input id="loc-place" value={editing.draft.google_place_id ?? ""} onChange={(e) => updateDraft({ google_place_id: e.target.value })} className="font-mono text-xs" placeholder="ChIJ…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-notes">Notes</Label>
                  <Textarea id="loc-notes" value={editing.draft.notes ?? ""} onChange={(e) => updateDraft({ notes: e.target.value })} className="min-h-[38px]" placeholder="Anything the agent should know about this location" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing?.id ? "Save changes" : "Add location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.is_primary
                ? "This is the primary location. Until another one is made primary, QA will report contact details as unverifiable."
                : "The location is removed from the client's canonical record. Pages that mention it are not changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
