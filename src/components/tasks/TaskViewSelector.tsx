import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Table, LayoutGrid, Calendar } from "lucide-react";

interface TaskViewSelectorProps {
  value: "kanban" | "list" | "table" | "weekly";
  onChange: (value: "kanban" | "list" | "table" | "weekly") => void;
}

export const TaskViewSelector = ({ value, onChange }: TaskViewSelectorProps) => {
  return (
    <Tabs value={value} onValueChange={onChange as (value: string) => void}>
      <TabsList>
        <TabsTrigger value="kanban" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Kanban</span>
        </TabsTrigger>
        <TabsTrigger value="list" className="gap-2">
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </TabsTrigger>
        <TabsTrigger value="table" className="gap-2">
          <Table className="h-4 w-4" />
          <span className="hidden sm:inline">Table</span>
        </TabsTrigger>
        <TabsTrigger value="weekly" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Weekly</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
