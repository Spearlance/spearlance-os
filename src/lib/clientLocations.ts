/**
 * Canonical NAP (name / address / phone / hours) helpers for client_locations.
 * Mirrors the column comments in migration 20260910120000 and the shape the
 * QA agent receives in supabase/functions/_shared/taskQa.ts.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_SHORT: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** "08:00" 24h strings. */
export interface HoursInterval {
  open: string;
  close: string;
}

/** Missing key or [] = closed that day. {} = hours unknown. */
export type HoursMap = Partial<Record<DayKey, HoursInterval[]>>;

export interface ClientLocationInput {
  label: string;
  is_primary?: boolean;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  hours: HoursMap;
  hours_note: string | null;
  google_place_id: string | null;
  gbp_location_id: string | null;
  notes: string | null;
}

export const EMPTY_LOCATION: ClientLocationInput = {
  label: "Main location",
  business_name: null,
  phone: null,
  email: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  country: "US",
  hours: {},
  hours_note: null,
  google_place_id: null,
  gbp_location_id: null,
  notes: null,
};

/** Digits only; matches the generated phone_digits column. */
export function phoneDigits(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length ? d : null;
}

/** (603) 555-0100 for US 10-digit (or 11 with leading 1); otherwise input trimmed. */
export function formatPhone(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  const d = phoneDigits(raw);
  if (!d) return "";
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length !== 10) return raw;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export interface AddressParts {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

/** "123 Main St, Suite 4, Concord, NH 03301" (country appended only when not US). */
export function formatAddress(a: AddressParts): string {
  const street = [a.address_line1, a.address_line2].map((s) => (s ?? "").trim()).filter(Boolean).join(", ");
  const cityState = [a.city?.trim(), [a.state?.trim(), a.postal_code?.trim()].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const parts = [street, cityState].filter(Boolean);
  const country = (a.country ?? "").trim().toUpperCase();
  if (country && country !== "US" && country !== "USA") parts.push(country);
  return parts.join(", ");
}

export function isHoursKnown(hours: HoursMap | null | undefined): boolean {
  return !!hours && Object.keys(hours).length > 0;
}

/** "8:00 AM" from "08:00"; passes anything unparseable through. */
export function formatTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return t;
  const h = Number(m[1]);
  const min = m[2];
  if (h < 0 || h > 23) return t;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suffix}`;
}

function intervalsText(intervals: HoursInterval[] | undefined): string {
  if (!intervals || intervals.length === 0) return "Closed";
  return intervals.map((i) => `${formatTime(i.open)} – ${formatTime(i.close)}`).join(", ");
}

/**
 * Human lines, consecutive days with identical hours collapsed:
 *   ["Mon – Fri: 8:00 AM – 5:00 PM", "Sat: 9:00 AM – 12:00 PM", "Sun: Closed"]
 * Empty array when hours are unknown.
 */
export function formatHours(hours: HoursMap | null | undefined): string[] {
  if (!isHoursKnown(hours)) return [];
  const lines: string[] = [];
  let runStart: DayKey | null = null;
  let runText = "";
  const flush = (end: DayKey) => {
    if (!runStart) return;
    const range = runStart === end ? DAY_SHORT[runStart] : `${DAY_SHORT[runStart]} – ${DAY_SHORT[end]}`;
    lines.push(`${range}: ${runText}`);
  };
  let prev: DayKey | null = null;
  for (const day of DAY_KEYS) {
    const text = intervalsText(hours![day]);
    if (runStart && text === runText) {
      prev = day;
      continue;
    }
    if (runStart && prev) flush(prev);
    runStart = day;
    runText = text;
    prev = day;
  }
  if (runStart && prev) flush(prev);
  return lines;
}

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Validation message for the form, or null when the location is saveable. */
export function locationProblem(loc: ClientLocationInput): string | null {
  if (!loc.label.trim()) return "Give the location a label.";
  if (loc.phone && !phoneDigits(loc.phone)) return "The phone number has no digits.";
  if (loc.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loc.email.trim())) return "That email address doesn't look valid.";
  for (const day of DAY_KEYS) {
    for (const i of loc.hours[day] ?? []) {
      if (!TIME_RE.test(i.open) || !TIME_RE.test(i.close)) return `${DAY_LABELS[day]}: times must be HH:MM (24h).`;
      if (i.open >= i.close) return `${DAY_LABELS[day]}: closing time must be after opening time.`;
    }
  }
  const hasAny =
    loc.business_name || loc.phone || loc.address_line1 || loc.city || isHoursKnown(loc.hours);
  if (!hasAny) return "Add at least a phone, an address or hours.";
  return null;
}

/** Strip blanks to null so the row stays clean and the agent sees real gaps as null. */
export function normalizeLocation(loc: ClientLocationInput): ClientLocationInput {
  const t = (s: string | null | undefined) => {
    const v = (s ?? "").trim();
    return v ? v : null;
  };
  const hours: HoursMap = {};
  for (const day of DAY_KEYS) {
    const ivs = (loc.hours[day] ?? []).filter((i) => i.open && i.close);
    if (day in loc.hours) hours[day] = ivs;
  }
  return {
    ...loc,
    label: loc.label.trim() || "Main location",
    business_name: t(loc.business_name),
    phone: t(loc.phone) ? formatPhone(loc.phone) : null,
    email: t(loc.email)?.toLowerCase() ?? null,
    address_line1: t(loc.address_line1),
    address_line2: t(loc.address_line2),
    city: t(loc.city),
    state: t(loc.state)?.toUpperCase() ?? null,
    postal_code: t(loc.postal_code),
    country: (t(loc.country) ?? "US").toUpperCase(),
    hours,
    hours_note: t(loc.hours_note),
    google_place_id: t(loc.google_place_id),
    gbp_location_id: t(loc.gbp_location_id),
    notes: t(loc.notes),
  };
}
