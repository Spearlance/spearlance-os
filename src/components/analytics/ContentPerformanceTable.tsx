import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentData {
  content_type: string;
  content_slug: string;
  content_title: string;
  total_views: number;
  unique_visitors: number;
  total_leads: number;
  conversion_rate: number;
}

interface ContentPerformanceTableProps {
  data?: ContentData[];
  isLoading?: boolean;
}

export function ContentPerformanceTable({ data, isLoading }: ContentPerformanceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Performance</CardTitle>
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
          <CardTitle>Content Performance</CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No content tracked yet</p>
            <p className="text-sm text-muted-foreground">
              Content will appear here once visitors view blog posts or local pages
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total Views</TableHead>
                <TableHead>Unique Visitors</TableHead>
                <TableHead>Leads Generated</TableHead>
                <TableHead>Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {item.content_title || item.content_slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.content_type === 'blog' ? 'default' : 'secondary'}>
                      {item.content_type === 'blog' ? 'Blog' : 'Local Page'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.total_views.toLocaleString()}</TableCell>
                  <TableCell>{item.unique_visitors.toLocaleString()}</TableCell>
                  <TableCell>{item.total_leads.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={item.conversion_rate > 5 ? 'text-success font-semibold' : ''}>
                      {item.conversion_rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
