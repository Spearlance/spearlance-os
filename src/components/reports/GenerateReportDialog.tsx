import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  BarChart3, 
  Target, 
  Globe, 
  Search,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: (report: any) => void;
}

interface Channel {
  id: string;
  name: string;
}

const REPORT_TYPES = [
  {
    id: 'performance_summary',
    title: 'Performance Summary',
    description: 'Comprehensive overview of all marketing channels',
    icon: BarChart3,
  },
  {
    id: 'channel_deep_dive',
    title: 'Channel Deep Dive',
    description: 'Detailed analysis of specific marketing channels',
    icon: Target,
  },
  {
    id: 'website_analytics',
    title: 'Website Analytics',
    description: 'User behavior, engagement, and UX insights',
    icon: Globe,
  },
  {
    id: 'seo_report',
    title: 'SEO Report',
    description: 'Keyword rankings, visibility, and search performance',
    icon: Search,
  },
];

const DATE_PRESETS = [
  { id: 'last_week', label: 'Last Week' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_quarter', label: 'Last Quarter' },
  { id: 'custom', label: 'Custom Range' },
];

export const GenerateReportDialog = ({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: GenerateReportDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  
  // Form state
  const [reportType, setReportType] = useState<string>('performance_summary');
  const [datePreset, setDatePreset] = useState<string>('last_month');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [reportName, setReportName] = useState<string>('');
  const [dataAvailability, setDataAvailability] = useState<{
    hasData: boolean;
    availableRange: { start: string; end: string } | null;
    checking: boolean;
  }>({ hasData: true, availableRange: null, checking: false });

  useEffect(() => {
    if (open && clientId) {
      loadChannels();
      // Reset form
      setStep(1);
      setReportType('performance_summary');
      setDatePreset('last_month');
      setSelectedChannels([]);
      setReportName('');
      setDataAvailability({ hasData: true, availableRange: null, checking: false });
    }
  }, [open, clientId]);

  // Check data availability when step 2 is completed or date range changes
  useEffect(() => {
    if (step === 2 && clientId && (reportType === 'website_analytics' || reportType === 'performance_summary')) {
      checkDataAvailability();
    }
  }, [step, datePreset, customDateStart, customDateEnd, reportType, clientId]);

  const loadChannels = async () => {
    const { data } = await supabase
      .from('marketing_flow_channels')
      .select(`
        id,
        name,
        stage:marketing_flow_stages!inner(
          flow:marketing_flows!inner(client_id)
        )
      `)
      .eq('stage.flow.client_id', clientId);

    if (data) {
      setChannels(data.map(c => ({ id: c.id, name: c.name })));
    }
  };

  const checkDataAvailability = async () => {
    const { start, end } = getDateRange();
    if (!start || !end) return;

    setDataAvailability(prev => ({ ...prev, checking: true }));

    try {
      // Check if there's any Clarity data for this client in the selected date range
      const { data: clarityData, error: clarityError } = await supabase
        .from('clarity_daily_metrics')
        .select('metric_date, total_sessions')
        .eq('client_id', clientId)
        .gte('metric_date', start)
        .lte('metric_date', end)
        .gt('total_sessions', 0)
        .order('metric_date', { ascending: true });

      // Also get the overall available range for this client
      const { data: rangeData } = await supabase
        .from('clarity_daily_metrics')
        .select('metric_date')
        .eq('client_id', clientId)
        .gt('total_sessions', 0)
        .order('metric_date', { ascending: true })
        .limit(1);

      const { data: latestData } = await supabase
        .from('clarity_daily_metrics')
        .select('metric_date')
        .eq('client_id', clientId)
        .gt('total_sessions', 0)
        .order('metric_date', { ascending: false })
        .limit(1);

      const hasData = clarityData && clarityData.length > 0;
      const availableRange = rangeData?.[0] && latestData?.[0] 
        ? { start: rangeData[0].metric_date, end: latestData[0].metric_date }
        : null;

      setDataAvailability({
        hasData,
        availableRange,
        checking: false,
      });
    } catch (error) {
      console.error('Error checking data availability:', error);
      setDataAvailability(prev => ({ ...prev, checking: false }));
    }
  };

  const getDateRange = (): { start: string; end: string } => {
    const today = new Date();
    
    switch (datePreset) {
      case 'last_week': {
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        return {
          start: format(lastWeekStart, 'yyyy-MM-dd'),
          end: format(lastWeekEnd, 'yyyy-MM-dd'),
        };
      }
      case 'last_month': {
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));
        return {
          start: format(lastMonthStart, 'yyyy-MM-dd'),
          end: format(lastMonthEnd, 'yyyy-MM-dd'),
        };
      }
      case 'last_quarter': {
        const quarterStart = startOfMonth(subMonths(today, 3));
        const quarterEnd = endOfMonth(subMonths(today, 1));
        return {
          start: format(quarterStart, 'yyyy-MM-dd'),
          end: format(quarterEnd, 'yyyy-MM-dd'),
        };
      }
      case 'custom':
        return {
          start: customDateStart,
          end: customDateEnd,
        };
      default:
        return {
          start: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
          end: format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
        };
    }
  };

  const handleGenerate = async () => {
    const { start, end } = getDateRange();
    
    if (!start || !end) {
      toast({
        title: "Date range required",
        description: "Please select a date range for the report.",
        variant: "destructive",
      });
      return;
    }

    if (reportType === 'channel_deep_dive' && selectedChannels.length === 0) {
      toast({
        title: "Channel selection required",
        description: "Please select at least one channel to analyze.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        body: {
          client_id: clientId,
          report_type: reportType,
          date_range_start: start,
          date_range_end: end,
          selected_channels: reportType === 'channel_deep_dive' ? selectedChannels : undefined,
          report_name: reportName || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Report generated!",
        description: "Your AI report has been created successfully.",
      });

      onSuccess(data);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to generate report",
        description: error.message || "An error occurred while generating the report.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const canProceed = () => {
    if (step === 1) return !!reportType;
    if (step === 2) {
      if (datePreset === 'custom') {
        return !!customDateStart && !!customDateEnd;
      }
      return true;
    }
    if (step === 3) {
      if (reportType === 'channel_deep_dive') {
        return selectedChannels.length > 0;
      }
      return true;
    }
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the type of report you'd like to generate.
            </p>
            <RadioGroup value={reportType} onValueChange={setReportType}>
              <div className="grid gap-3">
                {REPORT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <label
                      key={type.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        reportType === type.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={type.id} className="mt-1" />
                      <Icon className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">{type.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the time period to analyze.
            </p>
            <RadioGroup value={datePreset} onValueChange={setDatePreset}>
              <div className="grid grid-cols-2 gap-3">
                {DATE_PRESETS.map((preset) => (
                  <label
                    key={preset.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      datePreset === preset.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={preset.id} />
                    <span className="font-medium">{preset.label}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Data availability warning */}
            {(reportType === 'website_analytics' || reportType === 'performance_summary') && !dataAvailability.checking && !dataAvailability.hasData && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>No website analytics data</strong> found for the selected date range ({getDateRange().start} to {getDateRange().end}).
                  {dataAvailability.availableRange ? (
                    <span className="block mt-1">
                      Data is available from <strong>{dataAvailability.availableRange.start}</strong> to <strong>{dataAvailability.availableRange.end}</strong>.
                      Consider adjusting your date range.
                    </span>
                  ) : (
                    <span className="block mt-1">
                      No Clarity analytics data has been synced yet for this client.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {dataAvailability.checking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking data availability...
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {reportType === 'channel_deep_dive' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Select the channels to include in your deep dive analysis.
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {channels.length > 0 ? (
                    channels.map((channel) => (
                      <label
                        key={channel.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedChannels.includes(channel.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedChannels.includes(channel.id)}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                        <span>{channel.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No channels found. The report will analyze available data.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2 pt-4">
              <Label>Report Name (optional)</Label>
              <Input
                placeholder="Enter a custom name for this report"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate a name based on report type and date range.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-2">Report Preview</h4>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Type:</span> {REPORT_TYPES.find(t => t.id === reportType)?.title}</p>
                <p><span className="text-muted-foreground">Period:</span> {getDateRange().start} to {getDateRange().end}</p>
                {reportType === 'channel_deep_dive' && selectedChannels.length > 0 && (
                  <p><span className="text-muted-foreground">Channels:</span> {selectedChannels.length} selected</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate AI Report
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Report Type' : step === 2 ? 'Date Range' : 'Options'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1 || generating}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={generating || !canProceed()}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
