import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PageData {
  page_path: string;
  pageviews: number;
  unique_visitors: number;
  entry_sessions: number;
  avg_engaged_time: number;
}

interface PagePerformanceTableProps {
  data?: PageData[];
  isLoading?: boolean;
}

export function PagePerformanceTable({ data, isLoading }: PagePerformanceTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof PageData>("pageviews");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof PageData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Page Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Page Performance</CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No page data available</p>
        </CardContent>
      </Card>
    );
  }

  const filteredData = data.filter(page =>
    page.page_path.toLowerCase().includes(search.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aVal > bVal ? 1 : -1) * multiplier;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Page Performance</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('page_path')}>
                    Page Path
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('pageviews')}>
                    Pageviews
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('unique_visitors')}>
                    Unique Visitors
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('entry_sessions')}>
                    Entry Sessions
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('avg_engaged_time')}>
                    Avg. Engaged Time
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.slice(0, 20).map((page, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">{page.page_path}</TableCell>
                  <TableCell>{page.pageviews.toLocaleString()}</TableCell>
                  <TableCell>{page.unique_visitors.toLocaleString()}</TableCell>
                  <TableCell>{page.entry_sessions.toLocaleString()}</TableCell>
                  <TableCell>{formatTime(page.avg_engaged_time)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sortedData.length > 20 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Showing top 20 of {sortedData.length} pages
          </p>
        )}
      </CardContent>
    </Card>
  );
}
