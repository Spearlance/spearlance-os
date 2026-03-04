import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Save, Loader2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek, endOfWeek, parseISO } from "date-fns";

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

interface ChannelKPIsTabProps {
  channelId: string;
  channelName: string;
  isAdminOrFMM: boolean;
}

interface Campaign {
  id: string;
  name: string;
}

export function ChannelKPIsTab({ channelId, channelName, isAdminOrFMM }: ChannelKPIsTabProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [kpiData, setKpiData] = useState<Record<string, number | string>>({});
  const [aggregateData, setAggregateData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Array<{ week_start_date: string; kpi_data: Record<string, number> }>>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const kpiConfig = CHANNEL_KPI_CONFIG[channelName];
  const isAggregateView = selectedCampaignId === null && campaigns.length > 0;

  // Load campaigns for this channel
  useEffect(() => {
    const loadCampaigns = async () => {
      const { data, error } = await supabase
        .from("marketing_flow_campaigns")
        .select("id, name")
        .eq("channel_id", channelId)
        .order("name");

      if (!error && data) {
        setCampaigns(data);
      }
    };
    loadCampaigns();
  }, [channelId]);

  useEffect(() => {
    if (kpiConfig) {
      loadKPIData();
      loadHistory();
    }
  }, [channelId, selectedWeek, kpiConfig, selectedCampaignId, campaigns.length]);

  const loadKPIData = async () => {
    setLoading(true);
    try {
      const weekDate = format(selectedWeek, "yyyy-MM-dd");
      
      // If aggregate view and campaigns exist, calculate totals from all campaigns
      if (isAggregateView) {
        const { data, error } = await supabase
          .from("channel_weekly_kpis")
          .select("kpi_data, campaign_id")
          .eq("channel_id", channelId)
          .eq("week_start_date", weekDate)
          .not("campaign_id", "is", null);

        if (error) throw error;

        // Sum up all campaign KPIs
        const totals: Record<string, number> = {};
        kpiConfig?.forEach((field) => {
          totals[field.key] = 0;
        });

        data?.forEach((record) => {
          const kpis = record.kpi_data as Record<string, number>;
          Object.entries(kpis).forEach(([key, value]) => {
            if (typeof value === "number") {
              totals[key] = (totals[key] || 0) + value;
            }
          });
        });

        setAggregateData(totals);
        setKpiData({});
      } else {
        // Load specific campaign data
        let query = supabase
          .from("channel_weekly_kpis")
          .select("kpi_data")
          .eq("channel_id", channelId)
          .eq("week_start_date", weekDate);
        
        if (selectedCampaignId) {
          query = query.eq("campaign_id", selectedCampaignId);
        } else {
          query = query.is("campaign_id", null);
        }

        const { data, error } = await query.maybeSingle();

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
        setAggregateData({});
      }
    } catch (error) {
      console.error("Error loading KPI data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      if (isAggregateView) {
        // For aggregate view, get all campaign KPIs and group by week
        const { data, error } = await supabase
          .from("channel_weekly_kpis")
          .select("week_start_date, kpi_data")
          .eq("channel_id", channelId)
          .not("campaign_id", "is", null)
          .order("week_start_date", { ascending: false });

        if (error) throw error;

        // Group by week and sum
        const weeklyTotals: Record<string, Record<string, number>> = {};
        data?.forEach((record) => {
          const week = record.week_start_date;
          if (!weeklyTotals[week]) {
            weeklyTotals[week] = {};
            kpiConfig?.forEach((field) => {
              weeklyTotals[week][field.key] = 0;
            });
          }
          const kpis = record.kpi_data as Record<string, number>;
          Object.entries(kpis).forEach(([key, value]) => {
            if (typeof value === "number") {
              weeklyTotals[week][key] = (weeklyTotals[week][key] || 0) + value;
            }
          });
        });

        // Convert to array and limit to 8 weeks
        const historyArray = Object.entries(weeklyTotals)
          .map(([week, kpis]) => ({ week_start_date: week, kpi_data: kpis }))
          .slice(0, 8);

        setHistory(historyArray);
      } else {
        let query = supabase
          .from("channel_weekly_kpis")
          .select("week_start_date, kpi_data")
          .eq("channel_id", channelId)
          .order("week_start_date", { ascending: false })
          .limit(8);
        
        if (selectedCampaignId) {
          query = query.eq("campaign_id", selectedCampaignId);
        } else {
          query = query.is("campaign_id", null);
        }

        const { data, error } = await query;

        if (error) throw error;
        setHistory(data?.map(d => ({
          week_start_date: d.week_start_date,
          kpi_data: d.kpi_data as Record<string, number>
        })) || []);
      }
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

      // Check if record exists first (handles NULL campaign_id properly)
      let existingQuery = supabase
        .from("channel_weekly_kpis")
        .select("id")
        .eq("channel_id", channelId)
        .eq("week_start_date", weekDate);

      if (selectedCampaignId) {
        existingQuery = existingQuery.eq("campaign_id", selectedCampaignId);
      } else {
        existingQuery = existingQuery.is("campaign_id", null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("channel_weekly_kpis")
          .update({ 
            kpi_data: cleanedData, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("channel_weekly_kpis")
          .insert({
            channel_id: channelId,
            campaign_id: selectedCampaignId || null,
            week_start_date: weekDate,
            kpi_data: cleanedData,
            created_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "KPIs saved successfully",
      });
      loadHistory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save KPIs",
        variant: "destructive",
      });
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
      {/* Campaign Selector - only show if campaigns exist */}
      {campaigns.length > 0 && (
        <div className="space-y-2">
          <Label>Select Campaign</Label>
          <Select
            value={selectedCampaignId || "aggregate"}
            onValueChange={(value) => setSelectedCampaignId(value === "aggregate" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Campaigns (aggregate)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aggregate">All Campaigns (aggregate)</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isAggregateView 
              ? "Showing combined totals from all campaigns (read-only)"
              : "Track KPIs for this specific campaign"
            }
          </p>
        </div>
      )}

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

      {/* KPI Display/Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {channelName} KPIs
            {isAggregateView && (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                <Calculator className="h-3 w-3" />
                Auto-calculated
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : isAggregateView ? (
            // Read-only aggregate view
            <div className="space-y-3">
              {kpiConfig.map((field) => (
                <div key={field.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{field.label}</span>
                  <span className="font-medium">
                    {formatValue(aggregateData[field.key], field.type)}
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                These totals are automatically calculated from all {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}.
                Select a specific campaign to enter KPIs.
              </p>
            </div>
          ) : (
            // Editable campaign-specific view
            <>
              {kpiConfig.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <div className="relative">
                    {field.type === "currency" && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      id={field.key}
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
            <CardTitle className="text-base">
              Recent Weeks
              {isAggregateView && (
                <span className="text-xs font-normal text-muted-foreground ml-2">(aggregated)</span>
              )}
            </CardTitle>
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
                        {format(parseISO(row.week_start_date + 'T12:00:00'), "MMM d")}
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