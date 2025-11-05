import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  category: string;
  created_at: string;
  updated_at: string;
};

type FeatureFlagManagerProps = {
  onFlagsUpdated?: () => void;
};

export function FeatureFlagManager({ onFlagsUpdated }: FeatureFlagManagerProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const loadFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setFlags(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading feature flags',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const toggleFlag = async (flagId: string, currentState: boolean) => {
    setUpdating(flagId);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled: !currentState })
        .eq('id', flagId);

      if (error) throw error;

      toast({
        title: 'Feature flag updated',
        description: `Feature ${!currentState ? 'enabled' : 'disabled'} successfully`,
      });

      loadFlags();
      onFlagsUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error updating feature flag',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      website: 'bg-blue-500',
      brand: 'bg-purple-500',
      marketing: 'bg-green-500',
      communication: 'bg-yellow-500',
      onboarding: 'bg-orange-500',
      support: 'bg-red-500',
      general: 'bg-gray-500',
    };
    return colors[category] || colors.general;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Toggle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((flag) => (
            <TableRow key={flag.id}>
              <TableCell className="font-medium">{flag.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-md">
                {flag.description || 'No description'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`${getCategoryColor(flag.category)} text-white`}>
                  {flag.category}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {flag.enabled ? (
                  <Badge variant="default" className="bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <X className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  {updating === flag.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => toggleFlag(flag.id, flag.enabled)}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
