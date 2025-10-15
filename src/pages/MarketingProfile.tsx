import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Edit, Plus, Loader2, Target } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { CompetitorDialog } from "@/components/competitors/CompetitorDialog";
import { CompetitorCard } from "@/components/competitors/CompetitorCard";

export default function MarketingProfile() {
  const { selectedClient } = useClient();
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

  if (!discoveryData || (!discoveryData.company.legal_name && !discoveryData.company.brand_name)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center max-w-md">
          <CardTitle className="mb-2">No Profile Data</CardTitle>
          <CardDescription className="mb-4">
            Complete the Discovery stage in Launch Pad to populate your marketing profile
          </CardDescription>
          <Button onClick={() => navigate("/launchpad")}>
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
              <div className="flex items-center justify-between">
                <CardTitle>Company Details</CardTitle>
                {editingCompanyDetails ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCompanyDetails(false);
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
                      }}
                      disabled={savingCompanyDetails}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveCompanyDetails}
                      disabled={savingCompanyDetails}
                    >
                      {savingCompanyDetails ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCompanyDetails(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingCompanyDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brand_name">Brand Name</Label>
                      <Input
                        id="brand_name"
                        value={companyDetailsForm.brand_name}
                        onChange={(e) => setCompanyDetailsForm({
                          ...companyDetailsForm,
                          brand_name: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="legal_name">Legal Name</Label>
                      <Input
                        id="legal_name"
                        value={companyDetailsForm.legal_name}
                        onChange={(e) => setCompanyDetailsForm({
                          ...companyDetailsForm,
                          legal_name: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website_url">Website</Label>
                      <Input
                        id="website_url"
                        value={companyDetailsForm.website_url}
                        onChange={(e) => setCompanyDetailsForm({
                          ...companyDetailsForm,
                          website_url: e.target.value
                        })}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={companyDetailsForm.industry}
                        onChange={(e) => setCompanyDetailsForm({
                          ...companyDetailsForm,
                          industry: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hq_city">HQ Location</Label>
                      <Input
                        id="hq_city"
                        value={companyDetailsForm.hq_city}
                        onChange={(e) => setCompanyDetailsForm({
                          ...companyDetailsForm,
                          hq_city: e.target.value
                        })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="service_areas">Service Areas (comma-separated)</Label>
                      <Input
                        id="service_areas"
                        value={companyDetailsForm.service_areas.join(", ")}
                        onChange={(e) => setCompanyDetailsForm({
                          ...companyDetailsForm,
                          service_areas: e.target.value.split(",").map(s => s.trim())
                        })}
                        placeholder="Region 1, Region 2, Region 3"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Brand Name</p>
                    <p className="font-medium">{discoveryData.company.brand_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Legal Name</p>
                    <p className="font-medium">{discoveryData.company.legal_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Website</p>
                    {discoveryData.company.website_url ? (
                      <a 
                        href={discoveryData.company.website_url.startsWith('http') 
                          ? discoveryData.company.website_url 
                          : `https://${discoveryData.company.website_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {discoveryData.company.website_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="font-medium">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Industry</p>
                    <p className="font-medium">{discoveryData.company.industry || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">HQ Location</p>
                    <p className="font-medium">{discoveryData.company.hq_city || "—"}</p>
                  </div>
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
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Primary Contact</CardTitle>
                {editingPrimaryContact ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPrimaryContact(false);
                        if (discoveryData?.contacts) {
                          setPrimaryContactForm({
                            primary_contact_name: discoveryData.contacts.primary_name || "",
                            primary_contact_email: discoveryData.contacts.primary_email || ""
                          });
                        }
                      }}
                      disabled={savingPrimaryContact}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePrimaryContact}
                      disabled={savingPrimaryContact}
                    >
                      {savingPrimaryContact ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPrimaryContact(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingPrimaryContact ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_contact_name">Name</Label>
                    <Input
                      id="primary_contact_name"
                      value={primaryContactForm.primary_contact_name}
                      onChange={(e) => setPrimaryContactForm({
                        ...primaryContactForm,
                        primary_contact_name: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="primary_contact_email">Email</Label>
                    <Input
                      id="primary_contact_email"
                      type="email"
                      value={primaryContactForm.primary_contact_email}
                      onChange={(e) => setPrimaryContactForm({
                        ...primaryContactForm,
                        primary_contact_email: e.target.value
                      })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{discoveryData.contacts.primary_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    {discoveryData.contacts.primary_email ? (
                      <a 
                        href={`mailto:${discoveryData.contacts.primary_email}`}
                        className="text-primary hover:underline"
                      >
                        {discoveryData.contacts.primary_email}
                      </a>
                    ) : (
                      <p className="font-medium">—</p>
                    )}
                  </div>
                </div>
              )}
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
                <Button variant="outline" size="sm" onClick={() => navigate("/marketing/services")}>
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Competitive Intelligence</h3>
              <p className="text-sm text-muted-foreground">
                Track competitors and their strategies to refine your positioning
              </p>
            </div>
            <Button onClick={() => {
              setEditingCompetitor(null);
              setCompetitorDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
          </div>

          {loadingCompetitors ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : competitors.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {competitors.map((competitor) => (
                <CompetitorCard
                  key={competitor.id}
                  competitor={competitor}
                  onEdit={() => {
                    setEditingCompetitor(competitor);
                    setCompetitorDialogOpen(true);
                  }}
                  onDelete={() => handleDeleteCompetitor(competitor.id, competitor.name)}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Competitors Added Yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Build your competitive intelligence database. Track their strengths, 
                  weaknesses, and how you differentiate to help the AI craft better positioning.
                </p>
                <Button onClick={() => {
                  setEditingCompetitor(null);
                  setCompetitorDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Competitor
                </Button>
              </CardContent>
            </Card>
          )}

          <CompetitorDialog
            open={competitorDialogOpen}
            onOpenChange={setCompetitorDialogOpen}
            competitor={editingCompetitor}
            clientId={selectedClient?.id!}
            onSuccess={() => {
              loadCompetitors();
              setCompetitorDialogOpen(false);
              setEditingCompetitor(null);
            }}
          />
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
