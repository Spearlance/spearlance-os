import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/pages/marketing-profile/OverviewTab";
import { BusinessModelTab } from "@/pages/marketing-profile/BusinessModelTab";
import { GoalsTab } from "@/pages/marketing-profile/GoalsTab";
import { CompetitionTab } from "@/pages/marketing-profile/CompetitionTab";
import { BrandVoiceTab } from "@/pages/marketing-profile/BrandVoiceTab";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DiscoveryData } from "@/lib/launchpadTypes";
import { StoryModal } from "@/components/launchpad/StoryModal";

export default function MarketingProfile() {
  const { selectedClient, loading: clientLoading } = useClient();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // Company Details editing states
  const [editingCompanyDetails, setEditingCompanyDetails] = useState(false);
  const [savingCompanyDetails, setSavingCompanyDetails] = useState(false);
  const [companyDetailsForm, setCompanyDetailsForm] = useState({
    brand_name: "",
    legal_name: "",
    website_url: "",
    industry: "",
    hq_city: "",
    service_areas: [] as string[]
  });

  // Primary Contact editing states
  const [editingPrimaryContact, setEditingPrimaryContact] = useState(false);
  const [savingPrimaryContact, setSavingPrimaryContact] = useState(false);
  const [primaryContactForm, setPrimaryContactForm] = useState({
    primary_contact_name: "",
    primary_contact_email: ""
  });

  // Economics editing states
  const [editingEconomics, setEditingEconomics] = useState(false);
  const [savingEconomics, setSavingEconomics] = useState(false);
  const [economicsForm, setEconomicsForm] = useState({
    aov: null as number | null,
    ltv: null as number | null,
    annual_revenue_goal: null as number | null,
    sales_process: ""
  });

  // Brand voice editing states
  const [editingBrandVoice, setEditingBrandVoice] = useState(false);
  const [savingBrandVoice, setSavingBrandVoice] = useState(false);
  const [brandVoiceForm, setBrandVoiceForm] = useState({
    tone: "",
    words_to_avoid: ""
  });

  // Brand story editing states
  const [editingBrandStory, setEditingBrandStory] = useState(false);
  const [savingBrandStory, setSavingBrandStory] = useState(false);
  const [brandStoryForm, setBrandStoryForm] = useState({
    executive_summary: "",
    key_themes: [] as string[],
    pain_points: [] as string[],
    value_propositions: [] as string[],
    target_audience_insights: "",
    marketing_angles: [] as string[]
  });

  // Competitor states
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(true);
  const [competitorDialogOpen, setCompetitorDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<any>(null);

  useEffect(() => {
    if (selectedClient) {
      loadProfileData();
      loadQuarterlyGoals();
      loadCompetitors();
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

  // Initialize company details form
  useEffect(() => {
    if (discoveryData?.company) {
      setCompanyDetailsForm({
        brand_name: discoveryData.company.brand_name || "",
        legal_name: discoveryData.company.legal_name || "",
        website_url: discoveryData.company.website_url || "",
        industry: discoveryData.company.industry || "",
        hq_city: discoveryData.company.hq_city || "",
        service_areas: discoveryData.company.service_areas || []
      });
    }
  }, [discoveryData]);

  // Initialize primary contact form
  useEffect(() => {
    if (discoveryData?.contacts) {
      setPrimaryContactForm({
        primary_contact_name: discoveryData.contacts.primary_name || "",
        primary_contact_email: discoveryData.contacts.primary_email || ""
      });
    }
  }, [discoveryData]);

  // Initialize economics form
  useEffect(() => {
    if (discoveryData) {
      setEconomicsForm({
        aov: discoveryData.model.aov || null,
        ltv: discoveryData.model.ltv || null,
        annual_revenue_goal: discoveryData.goals.annual_revenue_goal || null,
        sales_process: discoveryData.model.sales_process || ""
      });
    }
  }, [discoveryData]);

  // Initialize brand voice form
  useEffect(() => {
    if (discoveryData?.voice) {
      setBrandVoiceForm({
        tone: discoveryData.voice.tone || "",
        words_to_avoid: discoveryData.voice.words_to_avoid || ""
      });
    }
  }, [discoveryData]);

  // Initialize brand story form
  useEffect(() => {
    if (summary) {
      setBrandStoryForm({
        executive_summary: summary.executive_summary || "",
        key_themes: summary.key_themes || [],
        pain_points: summary.pain_points || [],
        value_propositions: summary.value_propositions || [],
        target_audience_insights: summary.target_audience_insights || "",
        marketing_angles: summary.marketing_angles || []
      });
    }
  }, [summary]);

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

  const loadCompetitors = async () => {
    if (!selectedClient) return;
    
    setLoadingCompetitors(true);
    try {
      const { data, error } = await supabase
        .from("competitors")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("name");

      if (error) throw error;
      setCompetitors(data || []);
    } catch (error: any) {
      console.error("Error loading competitors:", error);
      toast({
        title: "Error",
        description: "Failed to load competitors",
        variant: "destructive",
      });
    } finally {
      setLoadingCompetitors(false);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string, competitorName: string) => {
    if (!confirm(`Delete ${competitorName}?`)) return;

    try {
      const { error } = await supabase
        .from("competitors")
        .delete()
        .eq("id", competitorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Competitor deleted successfully",
      });
      loadCompetitors();
    } catch (error: any) {
      console.error("Error deleting competitor:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete competitor",
        variant: "destructive",
      });
    }
  };

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
    if (!selectedClient) return;

    setSavingCurrentState(true);
    
    try {
      const { error } = await supabase
        .from("client_business_model")
        .upsert({
          client_id: selectedClient.id,
          current_state_working: currentStateForm.working.trim() || null,
          current_state_not_working: currentStateForm.not_working.trim() || null,
          current_state_constraints: currentStateForm.constraints.trim() || null,
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Current state updated successfully",
      });
      
      await loadProfileData();
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

  const handleSaveCompanyDetails = async () => {
    if (!selectedClient) return;

    setSavingCompanyDetails(true);
    
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          brand_name: companyDetailsForm.brand_name.trim() || null,
          legal_name: companyDetailsForm.legal_name.trim() || null,
          website_url: companyDetailsForm.website_url.trim() || null,
          industry: companyDetailsForm.industry.trim() || null,
          hq_city: companyDetailsForm.hq_city.trim() || null,
          service_areas: companyDetailsForm.service_areas.filter(area => area.trim()),
        })
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company details updated successfully",
      });
      
      setEditingCompanyDetails(false);
      await loadProfileData();
    } catch (error: any) {
      console.error("Error updating company details:", error);
      toast({
        title: "Error",
        description: "Failed to update company details",
        variant: "destructive",
      });
    } finally {
      setSavingCompanyDetails(false);
    }
  };

  const handleSavePrimaryContact = async () => {
    if (!selectedClient) return;

    setSavingPrimaryContact(true);
    
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          primary_contact_name: primaryContactForm.primary_contact_name.trim() || null,
          primary_contact_email: primaryContactForm.primary_contact_email.trim() || null,
        })
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Primary contact updated successfully",
      });
      
      setEditingPrimaryContact(false);
      await loadProfileData();
    } catch (error: any) {
      console.error("Error updating primary contact:", error);
      toast({
        title: "Error",
        description: "Failed to update primary contact",
        variant: "destructive",
      });
    } finally {
      setSavingPrimaryContact(false);
    }
  };

  const handleSaveEconomics = async () => {
    if (!selectedClient) return;

    setSavingEconomics(true);
    
    try {
      const { error } = await supabase
        .from("client_business_model")
        .upsert({
          client_id: selectedClient.id,
          aov: economicsForm.aov,
          ltv: economicsForm.ltv,
          annual_revenue_goal: economicsForm.annual_revenue_goal,
          sales_process: economicsForm.sales_process.trim() || null,
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Business economics updated successfully",
      });
      
      setEditingEconomics(false);
      await loadProfileData();
    } catch (error: any) {
      console.error("Error updating economics:", error);
      toast({
        title: "Error",
        description: "Failed to update business economics",
        variant: "destructive",
      });
    } finally {
      setSavingEconomics(false);
    }
  };

  const handleSaveBrandVoice = async () => {
    if (!selectedClient) return;

    setSavingBrandVoice(true);
    
    try {
      const { error } = await supabase
        .from("client_brand_voice")
        .upsert({
          client_id: selectedClient.id,
          tone: brandVoiceForm.tone.trim() || null,
          words_to_avoid: brandVoiceForm.words_to_avoid.trim() || null,
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand voice updated successfully",
      });
      
      setEditingBrandVoice(false);
      await loadProfileData();
    } catch (error: any) {
      console.error("Error updating brand voice:", error);
      toast({
        title: "Error",
        description: "Failed to update brand voice",
        variant: "destructive",
      });
    } finally {
      setSavingBrandVoice(false);
    }
  };

  const handleSaveBrandStory = async () => {
    if (!selectedClient) return;

    setSavingBrandStory(true);
    
    try {
      // Fetch current brand voice data to preserve other fields
      const { data: currentData } = await supabase
        .from("client_brand_voice")
        .select("*")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      // Merge the updated story summary with existing data
      const updatedSummary = {
        executive_summary: brandStoryForm.executive_summary.trim() || null,
        key_themes: brandStoryForm.key_themes.filter(t => t.trim()),
        pain_points: brandStoryForm.pain_points.filter(p => p.trim()),
        value_propositions: brandStoryForm.value_propositions.filter(v => v.trim()),
        target_audience_insights: brandStoryForm.target_audience_insights.trim() || null,
        marketing_angles: brandStoryForm.marketing_angles.filter(a => a.trim())
      };

      const { error } = await supabase
        .from("client_brand_voice")
        .upsert({
          client_id: selectedClient.id,
          story_summary: updatedSummary,
          // Preserve existing fields
          tone: currentData?.tone,
          words_to_avoid: currentData?.words_to_avoid,
          story_recording_url: currentData?.story_recording_url,
          story_recording_asset_id: currentData?.story_recording_asset_id,
          story_transcript: currentData?.story_transcript,
          story_completed: currentData?.story_completed,
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand story updated successfully",
      });
      
      setEditingBrandStory(false);
      await loadProfileData();
    } catch (error: any) {
      console.error("Error updating brand story:", error);
      toast({
        title: "Error",
        description: "Failed to update brand story",
        variant: "destructive",
      });
    } finally {
      setSavingBrandStory(false);
    }
  };

  const handleCancelBrandStoryEdit = () => {
    if (summary) {
      setBrandStoryForm({
        executive_summary: summary.executive_summary || "",
        key_themes: summary.key_themes || [],
        pain_points: summary.pain_points || [],
        value_propositions: summary.value_propositions || [],
        target_audience_insights: summary.target_audience_insights || "",
        marketing_angles: summary.marketing_angles || []
      });
    }
    setEditingBrandStory(false);
  };

  const loadProfileData = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      // Fetch all profile data from permanent tables in parallel
      const [
        { data: clientData, error: clientError },
        { data: businessModel, error: businessModelError },
        { data: brandVoice, error: brandVoiceError },
        { data: services, error: servicesError },
        { data: submission, error: submissionError }
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("id", selectedClient.id)
          .single(),
        supabase
          .from("client_business_model")
          .select("*")
          .eq("client_id", selectedClient.id)
          .maybeSingle(),
        supabase
          .from("client_brand_voice")
          .select("*")
          .eq("client_id", selectedClient.id)
          .maybeSingle(),
        supabase
          .from("services")
          .select("name")
          .eq("client_id", selectedClient.id),
        supabase
          .from("launchpad_submissions")
          .select("id")
          .eq("client_id", selectedClient.id)
          .maybeSingle()
      ]);

      if (clientError) throw clientError;

      if (submission) {
        setSubmissionId(submission.id);
      }

      // Reconstruct DiscoveryData format from permanent tables
      const profileData: DiscoveryData = {
        company: {
          legal_name: clientData.legal_name || "",
          brand_name: clientData.brand_name || "",
          website_url: clientData.website_url || "",
          hq_city: clientData.hq_city || "",
          service_areas: clientData.service_areas || [],
          industry: clientData.industry || "",
        },
        contacts: {
          primary_name: clientData.primary_contact_name || "",
          primary_email: clientData.primary_contact_email || "",
          decision_makers: clientData.decision_makers || [],
        },
        model: {
          services: services?.map(s => s.name) || [],
          aov: businessModel?.aov || null,
          ltv: businessModel?.ltv || null,
          sales_process: businessModel?.sales_process || "",
        },
        goals: {
          quarter_goals: [],
          annual_revenue_goal: businessModel?.annual_revenue_goal || null,
        },
        state: {
          working: businessModel?.current_state_working || "",
          not_working: businessModel?.current_state_not_working || "",
          constraints: businessModel?.current_state_constraints || "",
        },
        competition: {
          competitors: [],
        },
        voice: {
          tone: brandVoice?.tone || "",
          words_to_avoid: brandVoice?.words_to_avoid || "",
        },
        story: {
          recording_url: brandVoice?.story_recording_url,
          recording_asset_id: brandVoice?.story_recording_asset_id,
          completed: brandVoice?.story_completed || false,
          transcript: brandVoice?.story_transcript,
          summary: brandVoice?.story_summary,
        },
      };

      setDiscoveryData(profileData);
      setTranscript(brandVoice?.story_transcript || "");
      setSummary(brandVoice?.story_summary || null);

    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load marketing profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStoryUpdate = async (storyData: any) => {
    if (!selectedClient) return;
    
    try {
      // Save the story data to client_brand_voice table
      const { error } = await supabase
        .from("client_brand_voice")
        .upsert({
          client_id: selectedClient.id,
          story_recording_url: storyData.recording_url,
          story_recording_asset_id: storyData.recording_asset_id,
          story_transcript: storyData.transcript,
          story_summary: storyData.summary,
          story_completed: storyData.completed,
        }, {
          onConflict: 'client_id'
        });

      if (error) throw error;

      // Now reload the profile data
      await loadProfileData();
      setStoryModalOpen(false);
      
      toast({
        title: "Story Updated",
        description: "Your brand story has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving story:", error);
      toast({
        title: "Error",
        description: "Failed to save story data",
        variant: "destructive",
      });
    }
  };

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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

  if (!discoveryData || (!discoveryData.company.legal_name && !discoveryData.company.brand_name)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center max-w-md">
          <CardTitle className="mb-2">No Profile Data</CardTitle>
          <CardDescription className="mb-4">
            Complete the Discovery stage in Launchpad to populate your marketing profile
          </CardDescription>
          <Button onClick={() => navigate("/launchpad")}>
            Go to Launchpad
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
        <OverviewTab
          discoveryData={discoveryData}
          companyDetailsForm={companyDetailsForm}
          setCompanyDetailsForm={setCompanyDetailsForm}
          editingCompanyDetails={editingCompanyDetails}
          setEditingCompanyDetails={setEditingCompanyDetails}
          savingCompanyDetails={savingCompanyDetails}
          handleSaveCompanyDetails={handleSaveCompanyDetails}
          primaryContactForm={primaryContactForm}
          setPrimaryContactForm={setPrimaryContactForm}
          editingPrimaryContact={editingPrimaryContact}
          setEditingPrimaryContact={setEditingPrimaryContact}
          savingPrimaryContact={savingPrimaryContact}
          handleSavePrimaryContact={handleSavePrimaryContact}
        />

        {/* BUSINESS MODEL TAB */}
        <BusinessModelTab
          discoveryData={discoveryData}
          economicsForm={economicsForm}
          setEconomicsForm={setEconomicsForm}
          editingEconomics={editingEconomics}
          setEditingEconomics={setEditingEconomics}
          savingEconomics={savingEconomics}
          handleSaveEconomics={handleSaveEconomics}
        />

        {/* GOALS & STRATEGY TAB */}
        <GoalsTab
          discoveryData={discoveryData}
          quarterlyGoals={quarterlyGoals}
          goalsLoading={goalsLoading}
          filterQuarter={filterQuarter}
          setFilterQuarter={setFilterQuarter}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          editingGoal={editingGoal}
          setEditingGoal={setEditingGoal}
          savingGoalId={savingGoalId}
          handleGoalFieldChange={handleGoalFieldChange}
          handleSaveGoal={handleSaveGoal}
          handleDeleteGoal={handleDeleteGoal}
          handleAddGoalClick={() => setAddGoalDialogOpen(true)}
          currentStateForm={currentStateForm}
          setCurrentStateForm={setCurrentStateForm}
          editingCurrentState={editingCurrentState}
          setEditingCurrentState={setEditingCurrentState}
          savingCurrentState={savingCurrentState}
          handleSaveCurrentState={handleSaveCurrentState}
          handleCancelCurrentStateEdit={handleCancelCurrentStateEdit}
          addGoalDialogOpen={addGoalDialogOpen}
          setAddGoalDialogOpen={setAddGoalDialogOpen}
          submissionId={submissionId}
          onGoalAdded={loadQuarterlyGoals}
          clientId={selectedClient.id}
        />
        {/* COMPETITION TAB */}
        <CompetitionTab
          competitors={competitors}
          loadingCompetitors={loadingCompetitors}
          competitorDialogOpen={competitorDialogOpen}
          setCompetitorDialogOpen={setCompetitorDialogOpen}
          editingCompetitor={editingCompetitor}
          setEditingCompetitor={setEditingCompetitor}
          onCompetitorSaved={loadCompetitors}
          clientId={selectedClient.id}
          onDeleteCompetitor={handleDeleteCompetitor}
        />

        {/* BRAND VOICE TAB */}
        <BrandVoiceTab
          discoveryData={discoveryData}
          brandVoiceForm={brandVoiceForm}
          setBrandVoiceForm={setBrandVoiceForm}
          editingBrandVoice={editingBrandVoice}
          setEditingBrandVoice={setEditingBrandVoice}
          savingBrandVoice={savingBrandVoice}
          handleSaveBrandVoice={handleSaveBrandVoice}
          brandStoryForm={brandStoryForm}
          setBrandStoryForm={setBrandStoryForm}
          editingBrandStory={editingBrandStory}
          setEditingBrandStory={setEditingBrandStory}
          savingBrandStory={savingBrandStory}
          handleSaveBrandStory={handleSaveBrandStory}
          handleCancelBrandStoryEdit={handleCancelBrandStoryEdit}
          storyModalOpen={storyModalOpen}
          setStoryModalOpen={setStoryModalOpen}
          transcript={transcript}
          summary={summary}
        />
      </Tabs>

      <StoryModal
        open={storyModalOpen}
        onOpenChange={setStoryModalOpen}
        submissionId={submissionId}
        clientId={selectedClient.id}
        initialData={discoveryData.story}
        onSuccess={handleStoryUpdate}
      />
    </div>
  );
}
