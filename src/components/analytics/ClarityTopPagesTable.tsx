import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClarityTopPagesTableProps {
  data?: Array<{
    url: string;
    sessions: number;
    users: number;
    avgScrollDepth: number;
    avgEngagementTime: number;
  }>;
  isLoading?: boolean;
}

function formatPath(url: string): string {
  try {
    // Try to extract just the path from the URL
    const urlObj = new URL(url, 'https://example.com');
    return urlObj.pathname || '/';
  } catch {
    // If it's already a path, return it
    return url.startsWith('/') ? url : `/${url}`;
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function ClarityTopPagesTable({ data, isLoading }: ClarityTopPagesTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          No page data available
        </CardContent>
      </Card>
    );
  }

  // Show top 10 pages
  const topPages = data.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Pages</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Scroll Depth</TableHead>
              <TableHead className="text-right">Avg. Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topPages.map((page, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium max-w-[300px] truncate" title={page.url}>
                  {formatPath(page.url)}
                </TableCell>
                <TableCell className="text-right">{page.sessions.toLocaleString()}</TableCell>
                <TableCell className="text-right">{page.users.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {page.avgScrollDepth > 0 ? `${page.avgScrollDepth}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {page.avgEngagementTime > 0 ? formatTime(page.avgEngagementTime) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
