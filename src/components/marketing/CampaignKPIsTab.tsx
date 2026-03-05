import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek, endOfWeek } from "date-fns";

interface KPIField {
  key: string;
  label: string;
  type: "number" | "currency";
}

const CHANNEL_KPI_CONFIG: Record<string, KPIField[]> = {
  "Website": [
    { key: "visitors", label: "Visitors", type: "number" },
    { key: "form_submissions", label: "Form Submissions", type: "number" },
    { key: "clicks_to_call", label: "Clicks to Call", type: "number" },
  ],
  "Google Ads": [
    { key: "spend", label: "Spend", type: "currency" },
    { key: "impressions", label: "Impressions", type: "number" },
    { key: "conversions", label: "Conversions", type: "number" },
    { key: "cost_per_conversion", label: "Cost Per Conversion", type: "currency" },
    { key: "phone_calls", label: "Phone Calls", type: "number" },
  ],
  "Facebook Ads": [
    { key: "spend", label: "Spend", type: "currency" },
    { key: "impressions", label: "Impressions", type: "number" },
    { key: "reach", label: "Reach", type: "number" },
    { key: "conversions", label: "Conversions", type: "number" },
    { key: "cost_per_conversion", label: "Cost Per Conversion", type: "currency" },
  ],
};

interface CampaignKPIsTabProps {
  campaignId: string;
  channelId: string;
  channelName: string;
  isAdminOrFMM: boolean;
}

export function CampaignKPIsTab({ campaignId, channelId, channelName, isAdminOrFMM }: CampaignKPIsTabProps) {
  const [selectedWeek, setSelectedWeek] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [kpiData, setKpiData] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Array<{ week_start_date: string; kpi_data: Record<string, number> }>>([]);

  const kpiConfig = CHANNEL_KPI_CONFIG[channelName];

  useEffect(() => {
    if (kpiConfig) {
      loadKPIData();
      loadHistory();
    }
  }, [campaignId, selectedWeek, kpiConfig]);

  const loadKPIData = async () => {
    setLoading(true);
    try {
      const weekDate = format(selectedWeek, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("channel_weekly_kpis")
        .select("kpi_data")
        .eq("channel_id", channelId)
        .eq("campaign_id", campaignId)
        .eq("week_start_date", weekDate)
        .maybeSingle();

      if (error) throw error;

      if (data?.kpi_data) {
        setKpiData(data.kpi_data as Record<string, number | string>);
      } else {
        const emptyData: Record<string, string> = {};
        kpiConfig?.forEach((field) => {
          emptyData[field.key] = "";
        });
        setKpiData(emptyData);
      }
    } catch (error) {
      console.error("Error loading KPI data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("channel_weekly_kpis")
        .select("week_start_date, kpi_data")
        .eq("channel_id", channelId)
        .eq("campaign_id", campaignId)
        .order("week_start_date", { ascending: false })
        .limit(8);

      if (error) throw error;
      setHistory(data?.map(d => ({
        week_start_date: d.week_start_date,
        kpi_data: d.kpi_data as Record<string, number>
      })) || []);
    } catch (error) {
      console.error("Error loading KPI history:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const weekDate = format(selectedWeek, "yyyy-MM-dd");
      
      const cleanedData: Record<string, number | null> = {};
      Object.entries(kpiData).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) {
          cleanedData[key] = null;
        } else {
          cleanedData[key] = typeof value === "string" ? parseFloat(value) || 0 : value;
        }
      });

      const { error } = await supabase
        .from("channel_weekly_kpis")
        .upsert({
          channel_id: channelId,
          campaign_id: campaignId,
          week_start_date: weekDate,
          kpi_data: cleanedData,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "channel_id,campaign_id,week_start_date"
        });

      if (error) throw error;

      toast.success("Success", { description: "KPIs saved successfully" });
      loadHistory();
    } catch (error) {
      toast.error("Error", { description: "Failed to save KPIs" });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setKpiData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const formatValue = (value: number | null | undefined, type: "number" | "currency") => {
    if (value === null || value === undefined) return "-";
    if (type === "currency") {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString();
  };

  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(selectedWeek, new Date(), { weekStartsOn: 1 });

  if (!kpiConfig) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        KPI tracking is not configured for this channel type.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="font-medium">
            {format(selectedWeek, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </div>
          {isCurrentWeek && (
            <span className="text-xs text-muted-foreground">Current Week</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
          disabled={isCurrentWeek}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI Input Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaign KPIs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {kpiConfig.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`campaign-${field.key}`}>{field.label}</Label>
                  <div className="relative">
                    {field.type === "currency" && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      id={`campaign-${field.key}`}
                      type="number"
                      step={field.type === "currency" ? "0.01" : "1"}
                      min="0"
                      placeholder="0"
                      className={field.type === "currency" ? "pl-7" : ""}
                      value={kpiData[field.key] ?? ""}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      disabled={!isAdminOrFMM}
                    />
                  </div>
                </div>
              ))}

              {isAdminOrFMM && (
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save KPIs
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* History Table */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Weeks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Week</TableHead>
                    {kpiConfig.map((field) => (
                      <TableHead key={field.key} className="text-right">
                        {field.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow 
                      key={row.week_start_date}
                      className={
                        format(selectedWeek, "yyyy-MM-dd") === row.week_start_date 
                          ? "bg-muted/50" 
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {format(new Date(row.week_start_date), "MMM d")}
                      </TableCell>
                      {kpiConfig.map((field) => (
                        <TableCell key={field.key} className="text-right">
                          {formatValue(row.kpi_data[field.key], field.type)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
