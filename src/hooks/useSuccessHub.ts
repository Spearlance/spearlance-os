import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { startOfWeek, format } from "date-fns";
import { Json } from "@/integrations/supabase/types";

export interface BusinessOutcome {
  id: string;
  title: string;
  description?: string;
}

export interface KPI {
  id: string;
  name: string;
  currentValue: string;
  previousValue?: string;
  change?: number;
  status: 'green' | 'yellow' | 'red';
  whyNote?: string;
}

export interface ManualWin {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface RiskBlocker {
  id: string;
  title: string;
  type: 'risk' | 'blocker';
  owner?: string;
  nextAction?: string;
  status: 'open' | 'resolved';
}

export interface NeedFromClient {
  id: string;
  title: string;
  type: 'approval' | 'access' | 'content' | 'other';
  status: 'pending' | 'received';
  dueDate?: string;
}

export interface OpenThread {
  id: string;
  question: string;
  context?: string;
  createdAt: string;
}

export interface SuccessLog {
  id: string;
  client_id: string;
  week_start_date: string;
  health_status: 'green' | 'yellow' | 'red';
  business_outcomes: BusinessOutcome[];
  kpis: KPI[];
  manual_wins: ManualWin[];
  risks_blockers: RiskBlocker[];
  needs_from_client: NeedFromClient[];
  open_threads: OpenThread[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientWithOwners {
  id: string;
  name: string;
  segment?: string;
  meeting_cadence?: string;
  csm_owner_id?: string;
  delivery_owner_ids?: string[];
  csm_owner?: { id: string; name: string; avatar_url?: string };
  delivery_owners?: { id: string; name: string; avatar_url?: string }[];
}

// Helper function to safely parse JSON arrays
function parseJsonArray<T>(data: Json | null | undefined, defaultValue: T[]): T[] {
  if (!data) return defaultValue;
  if (Array.isArray(data)) return data as unknown as T[];
  return defaultValue;
}

export function useSuccessHub() {
  const { selectedClient } = useClient();
  const [successLog, setSuccessLog] = useState<SuccessLog | null>(null);
  const [clientData, setClientData] = useState<ClientWithOwners | null>(null);
  const [lastCommunication, setLastCommunication] = useState<any>(null);
  const [nextMeeting, setNextMeeting] = useState<any>(null);
  const [thisWeekTasks, setThisWeekTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [recentCommunications, setRecentCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    if (selectedClient?.id) {
      loadAllData();
    }
  }, [selectedClient?.id]);

  const loadAllData = async () => {
    if (!selectedClient?.id) return;
    setLoading(true);
    
    await Promise.all([
      loadSuccessLog(),
      loadClientData(),
      loadLastCommunication(),
      loadNextMeeting(),
      loadThisWeekTasks(),
      loadCompletedTasks(),
      loadRecentCommunications(),
    ]);
    
    setLoading(false);
  };

  const loadSuccessLog = async () => {
    const { data, error } = await supabase
      .from('client_success_logs')
      .select('*')
      .eq('client_id', selectedClient!.id)
      .eq('week_start_date', weekStart)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading success log:', error);
      return;
    }

    if (data) {
      setSuccessLog({
        ...data,
        business_outcomes: parseJsonArray<BusinessOutcome>(data.business_outcomes, []),
        kpis: parseJsonArray<KPI>(data.kpis, []),
        manual_wins: parseJsonArray<ManualWin>(data.manual_wins, []),
        risks_blockers: parseJsonArray<RiskBlocker>(data.risks_blockers, []),
        needs_from_client: parseJsonArray<NeedFromClient>(data.needs_from_client, []),
        open_threads: parseJsonArray<OpenThread>(data.open_threads, []),
        health_status: (data.health_status as 'green' | 'yellow' | 'red') || 'green',
      });
    } else {
      setSuccessLog(null);
    }
  };

  const loadClientData = async () => {
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, segment, meeting_cadence, csm_owner_id, delivery_owner_ids')
      .eq('id', selectedClient!.id)
      .single();

    if (client) {
      let csmOwner = null;
      let deliveryOwners: any[] = [];

      if (client.csm_owner_id) {
        const { data: csm } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', client.csm_owner_id)
          .single();
        csmOwner = csm;
      }

      if (client.delivery_owner_ids?.length) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', client.delivery_owner_ids);
        deliveryOwners = owners || [];
      }

      setClientData({
        ...client,
        csm_owner: csmOwner,
        delivery_owners: deliveryOwners,
      });
    }
  };

  const loadLastCommunication = async () => {
    const { data } = await supabase
      .from('communication_logs')
      .select('*')
      .eq('client_id', selectedClient!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastCommunication(data);
  };

  const loadNextMeeting = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('client_id', selectedClient!.id)
      .gte('meeting_date', new Date().toISOString())
      .order('meeting_date', { ascending: true })
      .limit(1)
      .maybeSingle();
    setNextMeeting(data);
  };

  const loadThisWeekTasks = async () => {
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assignee_user_id_fkey(id, name, avatar_url)
      `)
      .eq('client_id', selectedClient!.id)
      .neq('status', 'done')
      .lte('due_date', endOfWeek.toISOString())
      .order('due_date', { ascending: true });
    setThisWeekTasks(data || []);
  };

  const loadCompletedTasks = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assignee_user_id_fkey(id, name, avatar_url)
      `)
      .eq('client_id', selectedClient!.id)
      .eq('status', 'done')
      .gte('updated_at', sevenDaysAgo.toISOString())
      .order('updated_at', { ascending: false });
    setCompletedTasks(data || []);
  };

  const loadRecentCommunications = async () => {
    const { data } = await supabase
      .from('communication_logs')
      .select('*')
      .eq('client_id', selectedClient!.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentCommunications(data || []);
  };

  const createOrUpdateLog = async (updates: Partial<SuccessLog>) => {
    const { data: user } = await supabase.auth.getUser();
    
    // Convert typed arrays to JSON for database
    const dbUpdates: Record<string, any> = { ...updates };
    if (updates.business_outcomes) dbUpdates.business_outcomes = updates.business_outcomes as unknown as Json;
    if (updates.kpis) dbUpdates.kpis = updates.kpis as unknown as Json;
    if (updates.manual_wins) dbUpdates.manual_wins = updates.manual_wins as unknown as Json;
    if (updates.risks_blockers) dbUpdates.risks_blockers = updates.risks_blockers as unknown as Json;
    if (updates.needs_from_client) dbUpdates.needs_from_client = updates.needs_from_client as unknown as Json;
    if (updates.open_threads) dbUpdates.open_threads = updates.open_threads as unknown as Json;
    
    if (successLog?.id) {
      const { error } = await supabase
        .from('client_success_logs')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', successLog.id);
      
      if (!error) {
        setSuccessLog({ ...successLog, ...updates } as SuccessLog);
      }
      return !error;
    } else {
      const { data, error } = await supabase
        .from('client_success_logs')
        .insert({
          client_id: selectedClient!.id,
          week_start_date: weekStart,
          created_by: user.user?.id,
          ...dbUpdates,
        })
        .select()
        .single();
      
      if (!error && data) {
        setSuccessLog({
          ...data,
          business_outcomes: parseJsonArray<BusinessOutcome>(data.business_outcomes, []),
          kpis: parseJsonArray<KPI>(data.kpis, []),
          manual_wins: parseJsonArray<ManualWin>(data.manual_wins, []),
          risks_blockers: parseJsonArray<RiskBlocker>(data.risks_blockers, []),
          needs_from_client: parseJsonArray<NeedFromClient>(data.needs_from_client, []),
          open_threads: parseJsonArray<OpenThread>(data.open_threads, []),
          health_status: (data.health_status as 'green' | 'yellow' | 'red') || 'green',
        });
      }
      return !error;
    }
  };

  const updateClientData = async (updates: Partial<ClientWithOwners>) => {
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', selectedClient!.id);
    
    if (!error) {
      setClientData(prev => prev ? { ...prev, ...updates } : null);
    }
    return !error;
  };

  return {
    successLog,
    clientData,
    lastCommunication,
    nextMeeting,
    thisWeekTasks,
    completedTasks,
    recentCommunications,
    loading,
    createOrUpdateLog,
    updateClientData,
    refreshData: loadAllData,
  };
}
