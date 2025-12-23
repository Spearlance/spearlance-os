import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Minus, ArrowUpDown } from "lucide-react";
import { SEOKeyword } from "@/hooks/useSEOKeywords";
import { Button } from "@/components/ui/button";

interface SEOKeywordsTableProps {
  keywords: SEOKeyword[];
  regions: string[];
  isLoading?: boolean;
}

type SortField = 'keyword' | 'position' | 'position_change' | 'best_position';
type SortOrder = 'asc' | 'desc';

export function SEOKeywordsTable({ keywords, regions, isLoading }: SEOKeywordsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filteredAndSortedKeywords = useMemo(() => {
    let filtered = keywords;

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(kw => 
        kw.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by region
    if (selectedRegion && selectedRegion !== "all") {
      filtered = filtered.filter(kw => kw.region === selectedRegion);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      // Handle nulls
      if (aVal === null) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null) bVal = sortOrder === 'asc' ? Infinity : -Infinity;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [keywords, searchQuery, selectedRegion, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getPositionBadge = (position: number | null) => {
    if (position === null) return <Badge variant="outline">—</Badge>;
    if (position <= 3) return <Badge className="bg-green-500">{position}</Badge>;
    if (position <= 10) return <Badge className="bg-blue-500">{position}</Badge>;
    if (position <= 30) return <Badge variant="secondary">{position}</Badge>;
    return <Badge variant="outline">{position}</Badge>;
  };

  const getChangeIndicator = (change: number | null) => {
    if (change === null || change === 0) {
      return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> 0</span>;
    }
    if (change > 0) {
      return <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +{change}</span>;
    }
    return <span className="text-red-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {change}</span>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredAndSortedKeywords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {keywords.length === 0 
              ? "No keywords tracked yet. Upload an SE Ranking report to get started."
              : "No keywords match your filters."}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('keyword')}
                    >
                      Keyword
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[180px]">Region</TableHead>
                  <TableHead className="text-center">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('position')}
                    >
                      Position
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('position_change')}
                    >
                      Change
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('best_position')}
                    >
                      Best
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedKeywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">{keyword.keyword}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {keyword.region || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPositionBadge(keyword.position)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {getChangeIndicator(keyword.position_change)}
                    </TableCell>
                    <TableCell className="text-center">
                      {keyword.best_position || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredAndSortedKeywords.length} of {keywords.length} keywords
        </div>
      </CardContent>
    </Card>
  );
}
