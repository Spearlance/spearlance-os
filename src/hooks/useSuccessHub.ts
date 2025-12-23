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
  business_outcomes?: BusinessOutcome[];
  kpis?: KPI[];
}

export interface ClientChannel {
  id: string;
  name: string;
  status: string;
  progress: number;
  stage_name: string;
  assigned_user?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

export interface QuickLink {
  id: string;
  client_id: string;
  label: string;
  url: string;
  icon?: string;
  display_order: number;
  created_by?: string;
  created_at: string;
}

// Helper function to safely parse JSON arrays
function parseJsonArray<T>(data: Json | null | undefined, defaultValue: T[]): T[] {
  if (!data) return defaultValue;
  if (Array.isArray(data)) return data as unknown as T[];
  return defaultValue;
}

export interface AIReport {
  id: string;
  report_type: string;
  report_name: string;
  date_range_start: string;
  date_range_end: string;
  executive_summary: string | null;
  report_content: string;
  created_at: string;
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
  const [clientChannels, setClientChannels] = useState<ClientChannel[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [recentReports, setRecentReports] = useState<AIReport[]>([]);
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
      loadClientChannels(),
      loadQuickLinks(),
      loadRecentReports(),
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
      .select('id, name, segment, meeting_cadence, csm_owner_id, delivery_owner_ids, business_outcomes, kpis')
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
        business_outcomes: parseJsonArray<BusinessOutcome>(client.business_outcomes, []),
        kpis: parseJsonArray<KPI>(client.kpis, []),
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

  const loadClientChannels = async () => {
    const { data: flow } = await supabase
      .from('marketing_flows')
      .select('id')
      .eq('client_id', selectedClient!.id)
      .maybeSingle();

    if (!flow) {
      setClientChannels([]);
      return;
    }

    const { data: stages } = await supabase
      .from('marketing_flow_stages')
      .select('id, name')
      .eq('flow_id', flow.id);

    if (!stages?.length) {
      setClientChannels([]);
      return;
    }

    const stageIds = stages.map(s => s.id);
    const stageMap = Object.fromEntries(stages.map(s => [s.id, s.name]));

    const { data: channels } = await supabase
      .from('marketing_flow_channels')
      .select('id, name, status, progress, stage_id, assigned_to')
      .in('stage_id', stageIds)
      .order('created_at', { ascending: true });

    if (channels) {
      // Get unique user IDs for assigned users
      const userIds = [...new Set(channels.filter(c => c.assigned_to).map(c => c.assigned_to))] as string[];
      
      // Fetch user profiles if there are any
      let userMap: Record<string, { id: string; name: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds);
        
        userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
      }

      setClientChannels(
        channels.map((ch) => ({
          id: ch.id,
          name: ch.name,
          status: ch.status || 'active',
          progress: ch.progress || 0,
          stage_name: stageMap[ch.stage_id] || 'Unknown',
          assigned_user: ch.assigned_to ? userMap[ch.assigned_to] : undefined,
        }))
      );
    }
  };

  const loadQuickLinks = async () => {
    const { data } = await supabase
      .from('client_quick_links')
      .select('*')
      .eq('client_id', selectedClient!.id)
      .order('display_order', { ascending: true });
    setQuickLinks(data || []);
  };

  const loadRecentReports = async () => {
    const { data } = await supabase
      .from('ai_generated_reports')
      .select('id, report_type, report_name, date_range_start, date_range_end, executive_summary, report_content, created_at')
      .eq('client_id', selectedClient!.id)
      .order('created_at', { ascending: false })
      .limit(3);
    setRecentReports(data || []);
  };

  const createOrUpdateLog = async (updates: Partial<SuccessLog>) => {
    const { data: user } = await supabase.auth.getUser();
    
    const dbUpdates: Record<string, any> = { ...updates };
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
    const dbUpdates: Record<string, any> = { ...updates };
    if (updates.business_outcomes) dbUpdates.business_outcomes = updates.business_outcomes as unknown as Json;
    if (updates.kpis) dbUpdates.kpis = updates.kpis as unknown as Json;

    const { error } = await supabase
      .from('clients')
      .update(dbUpdates)
      .eq('id', selectedClient!.id);
    
    if (!error) {
      setClientData(prev => prev ? { ...prev, ...updates } : null);
    }
    return !error;
  };

  const addQuickLink = async (link: Omit<QuickLink, 'id' | 'client_id' | 'created_at' | 'created_by'>) => {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('client_quick_links')
      .insert({
        client_id: selectedClient!.id,
        label: link.label,
        url: link.url,
        icon: link.icon,
        display_order: link.display_order,
        created_by: user.user?.id,
      })
      .select()
      .single();

    if (!error && data) {
      setQuickLinks(prev => [...prev, data]);
    }
    return !error;
  };

  const deleteQuickLink = async (linkId: string) => {
    const { error } = await supabase
      .from('client_quick_links')
      .delete()
      .eq('id', linkId);

    if (!error) {
      setQuickLinks(prev => prev.filter(l => l.id !== linkId));
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
    clientChannels,
    quickLinks,
    recentReports,
    loading,
    createOrUpdateLog,
    updateClientData,
    addQuickLink,
    deleteQuickLink,
    refreshData: loadAllData,
  };
}
