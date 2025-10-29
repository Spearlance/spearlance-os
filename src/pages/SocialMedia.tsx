import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MonthlyPlannerWizard } from "@/components/social/MonthlyPlannerWizard";
import { MonthlyCalendarTable } from "@/components/social/MonthlyCalendarTable";
import { MonthlyCalendarGrid } from "@/components/social/MonthlyCalendarGrid";
import { WeeklyCalendarView } from "@/components/social/WeeklyCalendarView";
import { CalendarViewSelector } from "@/components/social/CalendarViewSelector";
import { PostCreatorSheet } from "@/components/social/PostCreatorSheet";
import { StrategyForm } from "@/components/social/StrategyForm";
import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, Sparkles, PlusCircle, FileText, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SocialMedia = () => {
  const { selectedClient, loading: clientLoading } = useClient();
  const [showMonthlyWizard, setShowMonthlyWizard] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [generationType, setGenerationType] = useState<'all' | 'missing'>('all');
  const [viewType, setViewType] = useState<'table' | 'monthly' | 'weekly'>('table');
  const [activeTab, setActiveTab] = useState<'planner' | 'strategy'>('planner');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: monthlyPosts, refetch } = useQuery({
    queryKey: ['monthly-posts', selectedClient?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedClient) return [];
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('client_id', selectedClient.id)
        .gte('scheduled_date', startDate.toISOString())
        .lte('scheduled_date', endDate.toISOString())
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient,
  });

  const { data: activeStrategy } = useQuery({
    queryKey: ['active-strategy', selectedClient?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedClient) return null;
      const { data } = await supabase
        .from('social_media_strategy')
        .select('*')
        .eq('client_id', selectedClient.id)
        .or(`and(is_global.eq.false,month.eq.${selectedMonth},year.eq.${selectedYear}),is_global.eq.true`)
        .order('is_global', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedClient,
  });

  const strategyPostCount = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    // If no strategy exists, return total days in month
    if (!activeStrategy?.selected_days) return daysInMonth;
    
    // Calculate based on strategy's selected days
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = date.getDay();
      const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      if (activeStrategy.selected_days.includes(isoDayOfWeek)) {
        count++;
      }
    }
    
    return count;
  }, [activeStrategy, selectedMonth, selectedYear]);

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to manage their social media.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Social Media</h1>
        <p className="text-muted-foreground mt-2">
          Create and schedule posts that perfectly match your brand
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="planner">Planner</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="planner" className="space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2025, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
              </select>
            </div>

            <CalendarViewSelector value={viewType} onChange={setViewType} />

            <div className="ml-auto flex items-center gap-2">
              {monthlyPosts && monthlyPosts.length > 0 && (
                <Badge variant="secondary">
                  {monthlyPosts.length}/{strategyPostCount} planned
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Posts
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setShowPostCreator(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <div>Create Single Post</div>
                      <div className="text-xs text-muted-foreground">Step-by-step wizard</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setGenerationType('all');
                    setShowMonthlyWizard(true);
                  }}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <div>Generate All ({strategyPostCount} posts)</div>
                      <div className="text-xs text-muted-foreground">
                        {activeStrategy?.posting_frequency === 'weekdays' 
                          ? 'Mon-Fri only' 
                          : activeStrategy?.posting_frequency === 'daily'
                          ? 'Every day'
                          : activeStrategy?.posting_frequency === 'custom'
                          ? `${activeStrategy.selected_days.length} days/week`
                          : 'Based on strategy'}
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setGenerationType('missing');
                    setShowMonthlyWizard(true);
                  }}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <div>Fill Missing Days</div>
                      <div className="text-xs text-muted-foreground">Strategy days only</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {viewType === 'table' && (
            <MonthlyCalendarTable 
              posts={monthlyPosts || []} 
              onRefresh={refetch}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              expectedPostCount={strategyPostCount}
            />
          )}
          
          {viewType === 'monthly' && (
            <MonthlyCalendarGrid 
              posts={monthlyPosts || []} 
              onRefresh={refetch}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              activeStrategy={activeStrategy}
            />
          )}
          
          {viewType === 'weekly' && (
            <WeeklyCalendarView 
              posts={monthlyPosts || []} 
              onRefresh={refetch}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}
        </TabsContent>
        
        <TabsContent value="strategy" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Set your default posting strategy here. The AI will use these settings when generating posts.
            </AlertDescription>
          </Alert>
          
          <StrategyForm 
            clientId={selectedClient.id} 
            isGlobal 
            onSaved={() => toast.success("Strategy saved!")} 
          />
        </TabsContent>
      </Tabs>

      <MonthlyPlannerWizard 
        open={showMonthlyWizard}
        onOpenChange={setShowMonthlyWizard}
        onComplete={() => {
          setShowMonthlyWizard(false);
          refetch();
        }}
        month={selectedMonth}
        year={selectedYear}
        generationType={generationType}
        existingPostDates={monthlyPosts?.map(p => p.scheduled_date) || []}
        expectedPostCount={strategyPostCount}
        activeStrategy={activeStrategy}
      />

      <PostCreatorSheet
        open={showPostCreator}
        onOpenChange={setShowPostCreator}
        onComplete={() => {
          setShowPostCreator(false);
          refetch();
        }}
      />
    </div>
  );
};

export default SocialMedia;