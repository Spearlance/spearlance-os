import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface ApiError {
  id: string;
  created_at: string;
  function_name: string;
  error_message: string;
  error_type: string | null;
  client_id: string | null;
  user_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: Json | null;
}

interface ApiErrorsTabProps {
  clients: { id: string; name: string }[];
}

export function ApiErrorsTab({ clients }: ApiErrorsTabProps) {
  const { toast } = useToast();
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setErrors(data || []);
    } catch (err) {
      console.error('Error loading API errors:', err);
      toast({
        title: "Error loading API errors",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (errorId: string) => {
    setResolving(errorId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('api_error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', errorId);

      if (error) throw error;

      toast({ title: "Error marked as resolved" });
      loadErrors();
    } catch (err) {
      console.error('Error resolving:', err);
      toast({
        title: "Failed to resolve error",
        variant: "destructive",
      });
    } finally {
      setResolving(null);
    }
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const unresolvedCount = errors.filter(e => !e.resolved).length;

  const getClientName = (clientId: string | null) => {
    if (!clientId) return '-';
    const client = clients.find(c => c.id === clientId);
    return client?.name || clientId.slice(0, 8) + '...';
  };

  const getErrorTypeBadge = (errorType: string | null) => {
    switch (errorType) {
      case 'openai_quota':
        return <Badge variant="destructive">OpenAI Quota</Badge>;
      case 'rate_limit':
        return <Badge variant="destructive">Rate Limit</Badge>;
      case 'auth_failure':
        return <Badge variant="outline">Auth Failure</Badge>;
      case 'network_error':
        return <Badge variant="secondary">Network</Badge>;
      default:
        return <Badge variant="secondary">{errorType || 'Unknown'}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              API Error Log
            </CardTitle>
            {unresolvedCount > 0 && (
              <Badge variant="destructive">{unresolvedCount} unresolved</Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadErrors}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Track and resolve critical API failures across the platform
        </p>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-3 text-primary" />
            <p>No API errors recorded</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="max-w-[300px]">Error</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((error) => (
                <TableRow key={error.id} className={error.resolved ? 'opacity-60' : ''}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {error.function_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getErrorTypeBadge(error.error_type)}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm truncate" title={error.error_message}>
                      {error.error_message}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {getClientName(error.client_id)}
                  </TableCell>
                  <TableCell>
                    {error.resolved ? (
                      <Badge variant="secondary">Resolved</Badge>
                    ) : (
                      <Badge variant="destructive">Unresolved</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!error.resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolve(error.id)}
                        disabled={resolving === error.id}
                      >
                        {resolving === error.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span className="ml-1">Resolve</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
