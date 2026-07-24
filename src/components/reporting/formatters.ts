export const fmtInt = (v: number) => v.toLocaleString();

export const fmtPct = (v: number | null, digits = 1) =>
  v == null ? "—" : `${(v * 100).toFixed(digits)}%`;

export const fmtCurrency = (v: number | null) =>
  v == null ? "—" : v.toLocaleString(undefined, { style: "currency", currency: "USD" });

export const fmtPosition = (v: number | null) => (v == null ? "—" : v.toFixed(1));

export const fmtShortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
