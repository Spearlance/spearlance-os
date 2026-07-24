import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtInt, fmtPct, fmtPosition } from "@/components/reporting/formatters";
import type { GscTotals } from "@/lib/windsorAggregate";

interface GscDimensionTableProps {
  title: string;
  subtitle: string;
  keyHeader: string;
  rows: (GscTotals & { key: string })[];
  /** Render page URLs as path-only for readability. */
  stripOrigin?: boolean;
}

const displayKey = (key: string, stripOrigin?: boolean) => {
  if (!stripOrigin) return key;
  try {
    const url = new URL(key);
    return url.pathname + url.search;
  } catch {
    return key;
  }
};

/** Shared table for top queries / top pages aggregated over the range. */
export function GscDimensionTable({ title, subtitle, keyHeader, rows, stripOrigin }: GscDimensionTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No data in this range yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{keyHeader}</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="max-w-[280px] truncate text-sm" title={row.key}>
                    {displayKey(row.key, stripOrigin)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(row.clicks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(row.impressions)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(row.ctr)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPosition(row.position)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
