import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";


interface BuildOverviewTabProps {
  build: {
    id: string;
    name: string;
    status: string;
    target_launch_date: string | null;
    scope_summary: string | null;
  };
  onUpdate: (updates: Partial<BuildOverviewTabProps["build"]>) => void;
}

const statusOptions = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "launched", label: "Launched" },
];

export function BuildOverviewTab({ build, onUpdate }: BuildOverviewTabProps) {
  const [name, setName] = useState(build.name);
  const [scopeSummary, setScopeSummary] = useState(build.scope_summary || "");
  const [targetDate, setTargetDate] = useState(build.target_launch_date || "");

  // Fetch pages to calculate progress
  const { data: pages } = useQuery({
    queryKey: ["website-build-pages", build.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_build_pages")
        .select("status")
        .eq("build_id", build.id);

      if (error) throw error;
      return data;
    },
  });

  const totalPages = pages?.length || 0;
  const completedPages = pages?.filter(p => p.status === "reviewed" || p.status === "built").length || 0;
  const progressPercent = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (name !== build.name || scopeSummary !== (build.scope_summary || "") || targetDate !== (build.target_launch_date || "")) {
        onUpdate({
          name,
          scope_summary: scopeSummary || null,
          target_launch_date: targetDate || null,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [name, scopeSummary, targetDate]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={build.status}
              onValueChange={(value) => onUpdate({ status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Target Launch Date</Label>
            <Input
              id="target_date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Pages Completed</span>
              <span>{completedPages} / {totalPages}</span>
            </div>
            <Progress value={progressPercent} />
          </div>

          <div className="pt-4 space-y-2">
            <Label htmlFor="scope">Scope Summary</Label>
            <Textarea
              id="scope"
              placeholder="Describe the project scope, goals, and key deliverables..."
              value={scopeSummary}
              onChange={(e) => setScopeSummary(e.target.value)}
              rows={6}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
