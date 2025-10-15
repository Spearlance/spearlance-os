import { useState, useEffect, useMemo } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Edit, Plus, Loader2 } from "lucide-react";
import { DiscoveryData } from "@/lib/launchpadTypes";
import { StoryModal } from "@/components/launchpad/StoryModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MarketingProfile() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [discoveryData, setDiscoveryData] = useState<DiscoveryData | null>(null);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);
  const [quarterlyGoals, setQuarterlyGoals] = useState<any[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  
  // Filter and editing states
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);
  
  // Current State editing states
  const [editingCurrentState, setEditingCurrentState] = useState(false);
  const [savingCurrentState, setSavingCurrentState] = useState(false);
  const [currentStateForm, setCurrentStateForm] = useState({
    working: "",
    not_working: "",
    constraints: ""
  });

  useEffect(() => {
    if (selectedClient) {
      loadProfileData();
      loadQuarterlyGoals();
    }
  }, [selectedClient]);

  useEffect(() => {
    if (discoveryData?.state) {
      setCurrentStateForm({
        working: discoveryData.state.working || "",
        not_working: discoveryData.state.not_working || "",
        constraints: discoveryData.state.constraints || ""
      });
    }
  }, [discoveryData]);

  const loadQuarterlyGoals = async () => {
    if (!selectedClient) return;
    
    setGoalsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quarterly_goals")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("year", { ascending: false })
        .order("quarter", { ascending: false });

      if (error) throw error;
      setQuarterlyGoals(data || []);
    } catch (error: any) {
      console.error("Error loading quarterly goals:", error);
      toast({
        title: "Error",
        description: "Failed to load quarterly goals",
        variant: "destructive",
      });
    } finally {
      setGoalsLoading(false);
    }
  };

  // Derived state for filtering
  const availableYears = useMemo(() => {
    const years = [...new Set(quarterlyGoals.map(g => g.year))];
    return years.sort((a, b) => b - a);
  }, [quarterlyGoals]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear + i);
  }, []);

  const filteredGoals = useMemo(() => {
    return quarterlyGoals
      .filter(goal => {
        if (filterQuarter !== "all" && goal.quarter !== parseInt(filterQuarter)) return false;
        if (filterYear !== "all" && goal.year !== parseInt(filterYear)) return false;
        if (filterStatus !== "all" && goal.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by year DESC, then quarter DESC
        if (a.year !== b.year) return b.year - a.year;
        return b.quarter - a.quarter;
      });
  }, [quarterlyGoals, filterQuarter, filterYear, filterStatus]);

  // Editing functions
  const handleGoalFieldChange = (goalId: string, field: string, value: any) => {
    setEditingGoal((prev: any) => {
      if (!prev || prev.id !== goalId) {
        // Start editing this goal
        const goal = quarterlyGoals.find(g => g.id === goalId);
        return { ...goal, [field]: value };
      }
      // Update existing edit
      return { ...prev, [field]: value };
    });
  };

  const handleSaveGoal = async (goalId: string) => {
    if (!editingGoal) return;

    setSavingGoalId(goalId);
    
    try {
      const { error } = await supabase
        .from("quarterly_goals")
        .update({
          goal_text: editingGoal.goal_text,
          quarter: editingGoal.quarter,
          year: editingGoal.year,
          status: editingGoal.status,
          notes: editingGoal.notes || null,
          completed_at: editingGoal.status === 'achieved' || editingGoal.status === 'failed' 
            ? new Date().toISOString() 
            : null,
        })
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal updated successfully",
      });
      loadQuarterlyGoals();
      setEditingGoal(null);
    } catch (error: any) {
      console.error("Error updating goal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update goal",
        variant: "destructive",
      });
    } finally {
      setSavingGoalId(null);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const { error } = await supabase
        .from("quarterly_goals")
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });
      loadQuarterlyGoals();
    } catch (error: any) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive",
      });
    }
  };

  const handleSaveCurrentState = async () => {
    if (!submissionId) return;

    setSavingCurrentState(true);
    
    try {
      const { error } = await supabase
        .from("launchpad_submissions")
        .update({
          responses_json: {
            ...discoveryData,
            state: {
              working: currentStateForm.working.trim() || null,
              not_working: currentStateForm.not_working.trim() || null,
              constraints: currentStateForm.constraints.trim() || null,
            }
          }
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Current state updated successfully",
      });
      
      loadProfileData();
      setEditingCurrentState(false);
    } catch (error: any) {
      console.error("Error updating current state:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update current state",
        variant: "destructive",
      });
    } finally {
      setSavingCurrentState(false);
    }
  };

  const handleCancelCurrentStateEdit = () => {
    if (discoveryData?.state) {
      setCurrentStateForm({
        working: discoveryData.state.working || "",
        not_working: discoveryData.state.not_working || "",
        constraints: discoveryData.state.constraints || ""
      });
    }
    setEditingCurrentState(false);
  };

  const loadProfileData = async () => {
    if (!selectedClient) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("launchpad_submissions")
      .select("*")
      .eq("client_id", selectedClient.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data) {
      setSubmissionId(data.id);
      const responsesJson = data.responses_json as any;
      const discovery = responsesJson?.discovery as DiscoveryData;
      setDiscoveryData(discovery || null);
      
      // Load story data if completed
      if (discovery?.story?.completed) {
        setTranscript(discovery.story.transcript || "");
        setSummary(discovery.story.summary || null);
      }
    }
    setLoading(false);
  };

  const handleStoryUpdate = () => {
    loadProfileData();
    setStoryModalOpen(false);
    toast({
      title: "Story Updated",
      description: "Your brand story has been updated successfully",
    });
  };

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center">
          <CardTitle className="mb-2">No Client Selected</CardTitle>
          <CardDescription>Please select a client to view profile</CardDescription>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!discoveryData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center max-w-md">
          <CardTitle className="mb-2">No Profile Data</CardTitle>
          <CardDescription className="mb-4">
            Complete the Discovery stage in Launch Pad to populate your marketing profile
          </CardDescription>
          <Button onClick={() => window.location.href = "/launchpad"}>
            Go to Launch Pad
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Profile</h1>
        <p className="text-muted-foreground">Your brand foundation and business details</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="business">Business Model</TabsTrigger>
          <TabsTrigger value="goals">Goals & Strategy</TabsTrigger>
          <TabsTrigger value="competition">Competition</TabsTrigger>
          <TabsTrigger value="voice">Brand Voice</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Brand Name</p>
                  <p className="font-medium">{discoveryData.company.brand_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Legal Name</p>
                  <p className="font-medium">{discoveryData.company.legal_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Website</p>
                  <a 
                    href={discoveryData.company.website_url.startsWith('http') ? discoveryData.company.website_url : `https://${discoveryData.company.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {discoveryData.company.website_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {discoveryData.company.industry && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Industry</p>
                    <p className="font-medium">{discoveryData.company.industry}</p>
                  </div>
                )}
                {discoveryData.company.hq_city && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">HQ Location</p>
                    <p className="font-medium">{discoveryData.company.hq_city}</p>
                  </div>
                )}
                {discoveryData.company.service_areas && discoveryData.company.service_areas.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2">Service Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {discoveryData.company.service_areas.map((area, i) => (
                        <Badge key={i} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{discoveryData.contacts.primary_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <a 
                    href={`mailto:${discoveryData.contacts.primary_email}`}
                    className="text-primary hover:underline"
                  >
                    {discoveryData.contacts.primary_email}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BUSINESS MODEL TAB */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Core Services</CardTitle>
                  <CardDescription>Your main service offerings</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.href = "/marketing/services"}>
                  Manage Services
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {discoveryData.model.services.map((service, i) => (
                  <Badge key={i} variant="default">{service}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Economics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {discoveryData.model.aov && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Average Order Value</p>
                    <p className="text-2xl font-bold">${discoveryData.model.aov.toLocaleString()}</p>
                  </div>
                )}
                {discoveryData.model.ltv && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Lifetime Value</p>
                    <p className="text-2xl font-bold">${discoveryData.model.ltv.toLocaleString()}</p>
                  </div>
                )}
              </div>
              {discoveryData.model.sales_process && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Sales Process</p>
                  <p className="text-sm whitespace-pre-wrap">{discoveryData.model.sales_process}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GOALS & STRATEGY TAB */}
        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quarterly Goals</CardTitle>
                  <CardDescription>Track and manage goals across all quarters</CardDescription>
                </div>
                <Button onClick={() => setAddGoalDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {goalsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Filter/Sort Controls */}
                  <div className="flex gap-3 items-center flex-wrap">
                    <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Quarters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Quarters</SelectItem>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="achieved">Achieved</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="carried_over">Carried Over</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="ml-auto text-sm text-muted-foreground">
                      {filteredGoals.length} {filteredGoals.length === 1 ? 'goal' : 'goals'}
                    </div>
                  </div>

                  <Separator />

                  {/* Goals List */}
                  <div className="space-y-2">
                    {filteredGoals.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No goals found. Click "Add Goal" to get started.</p>
                      </div>
                    ) : (
                      <Accordion type="single" collapsible className="w-full">
                        {filteredGoals.map((goal) => (
                          <AccordionItem key={goal.id} value={goal.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3 flex-1 text-left">
                                <Badge variant="outline" className="shrink-0">
                                  Q{goal.quarter} {goal.year}
                                </Badge>
                                <span className="font-medium flex-1">{goal.goal_text}</span>
                                <Badge 
                                  variant={
                                    goal.status === 'achieved' ? 'default' : 
                                    goal.status === 'failed' ? 'destructive' : 
                                    goal.status === 'carried_over' ? 'secondary' :
                                    'outline'
                                  }
                                  className={goal.status === 'achieved' ? 'bg-green-500 hover:bg-green-600' : ''}
                                >
                                  {goal.status === 'in_progress' ? 'In Progress' :
                                   goal.status === 'achieved' ? 'Achieved' :
                                   goal.status === 'failed' ? 'Failed' :
                                   'Carried Over'}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="pt-4 space-y-4">
                                {/* Inline Edit Form */}
                                <div className="grid gap-4">
                                  <div>
                                    <Label>Goal</Label>
                                    <Textarea
                                      value={editingGoal?.id === goal.id ? editingGoal.goal_text : goal.goal_text}
                                      onChange={(e) => handleGoalFieldChange(goal.id, 'goal_text', e.target.value)}
                                      rows={3}
                                      className="mt-1"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label>Quarter</Label>
                                      <Select 
                                        value={editingGoal?.id === goal.id ? editingGoal.quarter.toString() : goal.quarter.toString()}
                                        onValueChange={(val) => handleGoalFieldChange(goal.id, 'quarter', parseInt(val))}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1">Q1</SelectItem>
                                          <SelectItem value="2">Q2</SelectItem>
                                          <SelectItem value="3">Q3</SelectItem>
                                          <SelectItem value="4">Q4</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label>Year</Label>
                                      <Select 
                                        value={editingGoal?.id === goal.id ? editingGoal.year.toString() : goal.year.toString()}
                                        onValueChange={(val) => handleGoalFieldChange(goal.id, 'year', parseInt(val))}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {yearOptions.map(year => (
                                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Status</Label>
                                    <Select 
                                      value={editingGoal?.id === goal.id ? editingGoal.status : goal.status}
                                      onValueChange={(val) => handleGoalFieldChange(goal.id, 'status', val)}
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="achieved">Achieved</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                        <SelectItem value="carried_over">Carried Over</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label>Notes</Label>
                                    <Textarea
                                      value={editingGoal?.id === goal.id ? (editingGoal.notes || '') : (goal.notes || '')}
                                      onChange={(e) => handleGoalFieldChange(goal.id, 'notes', e.target.value)}
                                      rows={2}
                                      placeholder="Add notes or context..."
                                      className="mt-1"
                                    />
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 justify-end">
                                  {editingGoal?.id === goal.id && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setEditingGoal(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleSaveGoal(goal.id)}
                                        disabled={savingGoalId === goal.id}
                                      >
                                        {savingGoalId === goal.id ? 'Saving...' : 'Save Changes'}
                                      </Button>
                                    </>
                                  )}
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeleteGoal(goal.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>

                                {/* Metadata */}
                                <div className="text-xs text-muted-foreground border-t pt-3">
                                  Created {new Date(goal.created_at).toLocaleDateString()}
                                  {goal.completed_at && ` • Completed ${new Date(goal.completed_at).toLocaleDateString()}`}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {discoveryData.goals.annual_revenue_goal && (
            <Card>
              <CardHeader>
                <CardTitle>Annual Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Revenue Goal</p>
                  <p className="text-3xl font-bold">${discoveryData.goals.annual_revenue_goal.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current State</CardTitle>
                {!editingCurrentState && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingCurrentState(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingCurrentState ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="working" className="text-green-600 dark:text-green-400">
                      What's Working
                    </Label>
                    <Textarea
                      id="working"
                      value={currentStateForm.working}
                      onChange={(e) => setCurrentStateForm(prev => ({ ...prev, working: e.target.value }))}
                      placeholder="Describe what's currently working well..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="not_working" className="text-orange-600 dark:text-orange-400">
                      Not Working
                    </Label>
                    <Textarea
                      id="not_working"
                      value={currentStateForm.not_working}
                      onChange={(e) => setCurrentStateForm(prev => ({ ...prev, not_working: e.target.value }))}
                      placeholder="Describe what's not working or challenges faced..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="constraints" className="text-muted-foreground">
                      Constraints
                    </Label>
                    <Textarea
                      id="constraints"
                      value={currentStateForm.constraints}
                      onChange={(e) => setCurrentStateForm(prev => ({ ...prev, constraints: e.target.value }))}
                      placeholder="List any constraints or limitations..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancelCurrentStateEdit}
                      disabled={savingCurrentState}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveCurrentState}
                      disabled={savingCurrentState}
                    >
                      {savingCurrentState ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {currentStateForm.working && (
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">What's Working</p>
                      <p className="text-sm whitespace-pre-wrap">{currentStateForm.working}</p>
                    </div>
                  )}
                  {currentStateForm.not_working && (
                    <div>
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Not Working</p>
                      <p className="text-sm whitespace-pre-wrap">{currentStateForm.not_working}</p>
                    </div>
                  )}
                  {currentStateForm.constraints && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Constraints</p>
                      <p className="text-sm whitespace-pre-wrap">{currentStateForm.constraints}</p>
                    </div>
                  )}
                  {!currentStateForm.working && !currentStateForm.not_working && !currentStateForm.constraints && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No current state information. Click "Edit" to add details.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPETITION TAB */}
        <TabsContent value="competition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Known Competitors</CardTitle>
            </CardHeader>
            <CardContent>
              {discoveryData.competition.competitors && discoveryData.competition.competitors.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {discoveryData.competition.competitors.map((competitor, i) => (
                    <Badge key={i} variant="outline" className="text-base py-2 px-4">
                      {competitor}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No competitors added</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRAND VOICE TAB */}
        <TabsContent value="voice" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice & Tone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {discoveryData.voice.tone && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Brand Personality</p>
                  <p className="whitespace-pre-wrap">{discoveryData.voice.tone}</p>
                </div>
              )}
              {discoveryData.voice.words_to_avoid && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Words to Avoid</p>
                  <p className="text-sm whitespace-pre-wrap">{discoveryData.voice.words_to_avoid}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Brand Story</CardTitle>
                  <CardDescription>Your origin story and what makes you different</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStoryModalOpen(true)}
                >
                  {discoveryData.story?.completed ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Story
                    </>
                  ) : (
                    <>Record Story</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {discoveryData.story?.completed && summary ? (
                <div className="space-y-6">
                  {summary.executive_summary && (
                    <div>
                      <h4 className="font-semibold mb-2">Executive Summary</h4>
                      <p className="text-sm text-muted-foreground">{summary.executive_summary}</p>
                    </div>
                  )}

                  {summary.key_themes && summary.key_themes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Key Themes</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.key_themes.map((theme: string, i: number) => (
                          <li key={i}>{theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.pain_points && summary.pain_points.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Pain Points</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.pain_points.map((point: string, i: number) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.value_propositions && summary.value_propositions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Value Propositions</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.value_propositions.map((prop: string, i: number) => (
                          <li key={i}>{prop}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.target_audience_insights && (
                    <div>
                      <h4 className="font-semibold mb-2">Target Audience Insights</h4>
                      <p className="text-sm text-muted-foreground">{summary.target_audience_insights}</p>
                    </div>
                  )}

                  {summary.marketing_angles && summary.marketing_angles.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Marketing Angles</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.marketing_angles.map((angle: string, i: number) => (
                          <li key={i}>{angle}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {transcript && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                        <ChevronDown className="h-4 w-4" />
                        View Full Transcript
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                          {transcript}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No story recorded yet. Record your brand story to unlock AI-powered marketing insights.
                  </p>
                  <Button onClick={() => setStoryModalOpen(true)}>
                    Record Your Story
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StoryModal
        open={storyModalOpen}
        onOpenChange={setStoryModalOpen}
        submissionId={submissionId}
        clientId={selectedClient.id}
        initialData={discoveryData.story}
        onSuccess={handleStoryUpdate}
      />

      {selectedClient && (
      <AddGoalDialog
        open={addGoalDialogOpen}
        onOpenChange={setAddGoalDialogOpen}
        clientId={selectedClient.id}
        onSuccess={loadQuarterlyGoals}
      />
      )}
    </div>
  );
}
