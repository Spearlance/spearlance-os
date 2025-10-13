import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface FilterState {
  search: string;
  tags: string[];
  status: 'all' | 'Active' | 'Archived';
  dateRange: { from: Date | null; to: Date | null };
  owner: string | null;
  pinnedOnly: boolean;
}

interface ReportFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  clientId: string;
}

export const ReportFilters = ({
  filters,
  onFiltersChange,
  clientId,
}: ReportFiltersProps) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableOwners, setAvailableOwners] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    loadFilterOptions();
  }, [clientId]);

  const loadFilterOptions = async () => {
    // Load unique tags
    const { data: reports } = await supabase
      .from("reports")
      .select("tags")
      .eq("client_id", clientId);

    if (reports) {
      const allTags = reports.flatMap((r) => r.tags || []);
      const uniqueTags = Array.from(new Set(allTags));
      setAvailableTags(uniqueTags);
    }

    // Load owners
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, name")
      .in("role", ["admin", "fmm"])
      .order("name");

    if (owners) setAvailableOwners(owners);
  };

  const updateFilters = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    updateFilters("tags", newTags);
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      tags: [],
      status: 'Active',
      dateRange: { from: null, to: null },
      owner: null,
      pinnedOnly: false,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.tags.length > 0 ||
    filters.status !== 'Active' ||
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.owner ||
    filters.pinnedOnly;

  return (
    <div className="bg-card border rounded-lg p-4 mb-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search reports by name or summary..."
          value={filters.search}
          onChange={(e) => updateFilters("search", e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {filters.tags.length > 0
                  ? `${filters.tags.length} selected`
                  : "All tags"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded"
                      onClick={() => toggleTag(tag)}
                    >
                      <input
                        type="checkbox"
                        checked={filters.tags.includes(tag)}
                        onChange={() => {}}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{tag}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tags yet</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value: 'all' | 'Active' | 'Archived') =>
              updateFilters("status", value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {filters.dateRange.from && filters.dateRange.to
                  ? `${format(filters.dateRange.from, "MMM d")} - ${format(filters.dateRange.to, "MMM d")}`
                  : "Any date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.dateRange.from || undefined,
                  to: filters.dateRange.to || undefined,
                }}
                onSelect={(range) => {
                  updateFilters("dateRange", {
                    from: range?.from || null,
                    to: range?.to || null,
                  });
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Owner */}
        <div className="space-y-2">
          <Label>Owner</Label>
          <Select
            value={filters.owner || "all"}
            onValueChange={(value) =>
              updateFilters("owner", value === "all" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {availableOwners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pinned */}
        <div className="space-y-2">
          <Label>Pinned</Label>
          <Select
            value={filters.pinnedOnly ? "pinned" : "all"}
            onValueChange={(value) =>
              updateFilters("pinnedOnly", value === "pinned")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reports</SelectItem>
              <SelectItem value="pinned">Pinned only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag} <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
