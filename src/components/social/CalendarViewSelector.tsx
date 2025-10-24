import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Calendar, CalendarDays } from "lucide-react";

interface CalendarViewSelectorProps {
  value: 'table' | 'monthly' | 'weekly';
  onChange: (value: 'table' | 'monthly' | 'weekly') => void;
}

export const CalendarViewSelector = ({ value, onChange }: CalendarViewSelectorProps) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as 'table' | 'monthly' | 'weekly')}>
      <TabsList>
        <TabsTrigger value="table">
          <List className="h-4 w-4 mr-2" />
          Table
        </TabsTrigger>
        <TabsTrigger value="monthly">
          <Calendar className="h-4 w-4 mr-2" />
          Month
        </TabsTrigger>
        <TabsTrigger value="weekly">
          <CalendarDays className="h-4 w-4 mr-2" />
          Week
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
