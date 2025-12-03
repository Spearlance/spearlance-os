import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { useSuccessHub, ManualWin, RiskBlocker, NeedFromClient, OpenThread, BusinessOutcome, KPI } from "@/hooks/useSuccessHub";
import { ClientSnapshotBar } from "@/components/success-hub/ClientSnapshotBar";
import { OutcomesKPIsCard } from "@/components/success-hub/OutcomesKPIsCard";
import { WeeklyPlanCard } from "@/components/success-hub/WeeklyPlanCard";
import { WinsShippedCard } from "@/components/success-hub/WinsShippedCard";
import { RisksBlockersCard } from "@/components/success-hub/RisksBlockersCard";
import { CommunicationHubCard } from "@/components/success-hub/CommunicationHubCard";
import { ActionButtons } from "@/components/success-hub/ActionButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { isPast, isToday } from "date-fns";

export default function ClientSuccessHub() {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const {
    successLog,
    clientData,
    lastCommunication,
    nextMeeting,
    thisWeekTasks,
    completedTasks,
    recentCommunications,
    loading,
    createOrUpdateLog,
    refreshData,
  } = useSuccessHub();

  // Check user role
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'fmm') {
        toast.error('Access denied. This page is for Admin and FMM only.');
        navigate('/dashboard');
        return;
      }

      setUserRole(profile.role);
      setRoleLoading(false);
    };

    checkRole();
  }, [navigate]);

  const handleHealthStatusChange = async (status: 'green' | 'yellow' | 'red') => {
    const success = await createOrUpdateLog({ health_status: status });
    if (success) {
      toast.success('Health status updated');
    }
  };

  const handleOutcomesKPIsUpdate = async (outcomes: BusinessOutcome[], kpis: KPI[]) => {
    const success = await createOrUpdateLog({ 
      business_outcomes: outcomes, 
      kpis: kpis 
    });
    if (success) {
      toast.success('Outcomes & KPIs updated');
    }
  };

  const handleAddWin = async (win: ManualWin) => {
    const currentWins = successLog?.manual_wins || [];
    const success = await createOrUpdateLog({ 
      manual_wins: [...currentWins, win] 
    });
    if (success) {
      toast.success('Win added');
    }
  };

  const handleRemoveWin = async (winId: string) => {
    const currentWins = successLog?.manual_wins || [];
    const success = await createOrUpdateLog({ 
      manual_wins: currentWins.filter(w => w.id !== winId) 
    });
    if (success) {
      toast.success('Win removed');
    }
  };

  const handleUpdateRisks = async (risks: RiskBlocker[]) => {
    const success = await createOrUpdateLog({ risks_blockers: risks });
    if (success) {
      toast.success('Risks updated');
    }
  };

  const handleUpdateNeeds = async (needs: NeedFromClient[]) => {
    const success = await createOrUpdateLog({ needs_from_client: needs });
    if (success) {
      toast.success('Needs updated');
    }
  };

  const handleUpdateThreads = async (threads: OpenThread[]) => {
    const success = await createOrUpdateLog({ open_threads: threads });
    if (success) {
      toast.success('Open threads updated');
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks?selected=${taskId}`);
  };

  // Calculate overdue tasks
  const overdueTasks = thisWeekTasks.filter(
    task => task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
  );

  if (roleLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please select a client to view their Success Hub.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Client Success Hub</h1>

      {/* Section 1: Client Snapshot */}
      <ClientSnapshotBar
        clientData={clientData}
        healthStatus={successLog?.health_status || 'green'}
        onHealthStatusChange={handleHealthStatusChange}
        lastCommunication={lastCommunication}
        nextMeeting={nextMeeting}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Section 2: Outcomes & KPIs */}
          <OutcomesKPIsCard
            outcomes={successLog?.business_outcomes || []}
            kpis={successLog?.kpis || []}
            onUpdate={handleOutcomesKPIsUpdate}
          />

          {/* Section 3: This Week's Plan */}
          <WeeklyPlanCard
            tasks={thisWeekTasks}
            onTaskClick={handleTaskClick}
          />

          {/* Section 4: Wins / Shipped */}
          <WinsShippedCard
            completedTasks={completedTasks}
            manualWins={successLog?.manual_wins || []}
            onAddWin={handleAddWin}
            onRemoveWin={handleRemoveWin}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Section 5: Risks / Blockers */}
          <RisksBlockersCard
            risksBlockers={successLog?.risks_blockers || []}
            needsFromClient={successLog?.needs_from_client || []}
            overdueTasks={overdueTasks}
            onUpdateRisks={handleUpdateRisks}
            onUpdateNeeds={handleUpdateNeeds}
          />

          {/* Section 6: Communication Hub */}
          <CommunicationHubCard
            communications={recentCommunications}
            openThreads={successLog?.open_threads || []}
            onUpdateThreads={handleUpdateThreads}
          />
        </div>
      </div>

      {/* Section 7: Action Buttons */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
        <ActionButtons clientId={selectedClient.id} onRefresh={refreshData} />
      </div>
    </div>
  );
}
