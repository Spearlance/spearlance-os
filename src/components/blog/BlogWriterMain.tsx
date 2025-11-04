import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, Sparkles, PlusCircle, FileText, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlogStrategyForm } from "./BlogStrategyForm";
import { BlogMonthlyGenerator } from "./BlogMonthlyGenerator";
import { BlogAIPreferencesForm } from "./BlogAIPreferencesForm";
import { BlogPostsList } from "./BlogPostsList";
import { BlogCalendarTable } from "./BlogCalendarTable";
import { BlogCalendarGrid } from "./BlogCalendarGrid";
import { BlogWeeklyCalendarView } from "./BlogWeeklyCalendarView";
import { CalendarViewSelector } from "@/components/social/CalendarViewSelector";
import { toast } from "sonner";

export function BlogWriterMain() {
  const { selectedClient, loading: clientLoading } = useClient();
  const [activeTab, setActiveTab] = useState<'planner' | 'drafts' | 'strategy'>('planner');
  const [showMonthlyWizard, setShowMonthlyWizard] = useState(false);
  const [generationType, setGenerationType] = useState<'all' | 'missing'>('all');
  const [viewType, setViewType] = useState<'table' | 'monthly' | 'weekly'>('table');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: monthlyTopics, refetch } = useQuery({
    queryKey: ['monthly-blog-topics', selectedClient?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedClient) return [];
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      const { data, error } = await supabase
        .from('blog_topics')
        .select('*, blog_posts(*)')
        .eq('client_id', selectedClient.id)
        .gte('suggested_publish_date', startDate.toISOString())
        .lte('suggested_publish_date', endDate.toISOString())
        .order('suggested_publish_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient,
  });

  const { data: activeStrategy } = useQuery({
    queryKey: ['active-blog-strategy', selectedClient?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedClient) return null;
      
      // First try to get month-specific strategy
      const { data: monthSpecific } = await supabase
        .from('blog_content_strategy')
        .select('*')
        .eq('client_id', selectedClient.id)
        .eq('is_global', false)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .maybeSingle();
      
      if (monthSpecific) return monthSpecific;
      
      // Fallback to global strategy
      const { data: global } = await supabase
        .from('blog_content_strategy')
        .select('*')
        .eq('client_id', selectedClient.id)
        .eq('is_global', true)
        .maybeSingle();
      
      return global;
    },
    enabled: !!selectedClient,
  });

  const strategyPostCount = useMemo(() => {
    // If no strategy or no selected days, return 0 to indicate no strategy configured
    if (!activeStrategy?.selected_days || activeStrategy.selected_days.length === 0) {
      return 0;
    }
    
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
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

  const { data: draftsCount } = useQuery({
    queryKey: ['blog-drafts-count', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return 0;
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', selectedClient.id)
        .eq('status', 'draft');
      return count || 0;
    },
    enabled: !!selectedClient,
  });

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select a client to manage their blog content.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Blog Writer</h1>
        <p className="text-muted-foreground mt-2">
          Plan your content strategy, generate topics in bulk, and create SEO-optimized articles
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="planner">Planner</TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts
            {draftsCount !== undefined && draftsCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {draftsCount}
              </Badge>
            )}
          </TabsTrigger>
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
              {monthlyTopics && monthlyTopics.length > 0 && (
                <Badge variant="secondary">
                  {monthlyTopics.length}/{strategyPostCount} planned
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Blog Posts
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => toast.info("Manual post creation coming soon")}>
                    <FileText className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <div>Write Single Post</div>
                      <div className="text-xs text-muted-foreground">Manual creation</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setGenerationType('all');
                    setShowMonthlyWizard(true);
                  }}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <div>
                        Generate All Topics
                        {strategyPostCount > 0 ? ` (${strategyPostCount} posts)` : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {!activeStrategy ? 'Configure strategy first' :
                         strategyPostCount === 0 ? 'No posting days selected' :
                         activeStrategy.posting_frequency === 'daily' ? 'Every day' :
                         activeStrategy.posting_frequency === 'weekdays' ? 'Mon-Fri only' :
                         activeStrategy.selected_days ? `${strategyPostCount} days/month` : ''}
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
            <BlogCalendarTable 
              topics={monthlyTopics || []} 
              onRefresh={refetch}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              expectedPostCount={strategyPostCount}
            />
          )}
          
          {viewType === 'monthly' && (
            <BlogCalendarGrid 
              topics={monthlyTopics || []} 
              onRefresh={refetch}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              activeStrategy={activeStrategy}
            />
          )}
          
          {viewType === 'weekly' && (
            <BlogWeeklyCalendarView 
              topics={monthlyTopics || []} 
              onRefresh={refetch}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}
        </TabsContent>
        
        <TabsContent value="drafts" className="space-y-6">
          <BlogPostsList status="draft" />
        </TabsContent>
        
        <TabsContent value="strategy" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure your posting strategy and provide context to help the AI generate better blog content.
            </AlertDescription>
          </Alert>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Content Strategy</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Define your posting frequency and content mix to generate perfectly balanced blog topics
            </p>
            <BlogStrategyForm clientId={selectedClient.id} />
          </Card>

          <BlogAIPreferencesForm clientId={selectedClient.id} />
        </TabsContent>
      </Tabs>

      <BlogMonthlyGenerator 
        clientId={selectedClient.id}
        open={showMonthlyWizard}
        onOpenChange={setShowMonthlyWizard}
        onComplete={() => {
          setShowMonthlyWizard(false);
          refetch();
        }}
        month={selectedMonth}
        year={selectedYear}
        generationType={generationType}
        existingTopicDates={monthlyTopics?.map(t => t.suggested_publish_date) || []}
        expectedPostCount={strategyPostCount}
        activeStrategy={activeStrategy}
      />
    </div>
  );
}
