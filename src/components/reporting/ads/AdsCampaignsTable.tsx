import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtInt, fmtPct } from "@/components/reporting/formatters";
import type { CampaignSummary } from "@/hooks/useGoogleAdsReporting";

export function AdsCampaignsTable({ rows }: { rows: CampaignSummary[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Campaigns</CardTitle>
        <p className="text-xs text-muted-foreground">Totals over the selected range, sorted by spend</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No campaign data in this range yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">Cost/conv.</TableHead>
                <TableHead className="text-right">Impr. share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.campaign}>
                  <TableCell className="max-w-[240px] truncate text-sm" title={row.campaign}>
                    {row.campaign}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(row.spend)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(row.clicks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(row.impressions)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(row.ctr)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(row.cpc)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Math.round(row.conversions * 10) / 10}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtCurrency(row.costPerConversion)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(row.searchImpressionShare, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
