import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface AnalyticsFiltersProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  comparisonEnabled: boolean;
  onComparisonToggle: (enabled: boolean) => void;
}

export function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
  comparisonEnabled,
  onComparisonToggle,
}: AnalyticsFiltersProps) {
  const quickRanges = [
    { label: "Last 7 Days", days: 7 },
    { label: "Last 30 Days", days: 30 },
    { label: "Last 90 Days", days: 90 },
  ];

  const handleQuickRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onDateRangeChange({ from, to });
  };

  const handleReset = () => {
    handleQuickRange(30);
    onComparisonToggle(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg">
      <div className="flex flex-wrap gap-2">
        {quickRanges.map(({ label, days }) => (
          <Button
            key={days}
            variant="outline"
            size="sm"
            onClick={() => handleQuickRange(days)}
          >
            {label}
          </Button>
        ))}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Custom
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to } as DateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-2">
          <Switch
            id="comparison"
            checked={comparisonEnabled}
            onCheckedChange={onComparisonToggle}
          />
          <Label htmlFor="comparison" className="cursor-pointer text-sm">
            Compare to previous period
          </Label>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="w-full text-sm text-muted-foreground border-t pt-3 mt-1">
        <span className="font-medium">Viewing:</span> {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
      </div>
    </div>
  );
}
