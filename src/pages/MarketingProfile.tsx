import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Edit } from "lucide-react";
import { DiscoveryData } from "@/lib/launchpadTypes";
import { StoryModal } from "@/components/launchpad/StoryModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export default function MarketingProfile() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [discoveryData, setDiscoveryData] = useState<DiscoveryData | null>(null);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (selectedClient) {
      loadProfileData();
    }
  }, [selectedClient]);

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
              <CardTitle>This Quarter</CardTitle>
            </CardHeader>
            <CardContent>
              {discoveryData.goals.quarter_goals && discoveryData.goals.quarter_goals.length > 0 ? (
                <ul className="space-y-2">
                  {discoveryData.goals.quarter_goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No quarterly goals set</p>
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
              <CardTitle>Current State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {discoveryData.state.working && (
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">What's Working</p>
                  <p className="text-sm whitespace-pre-wrap">{discoveryData.state.working}</p>
                </div>
              )}
              {discoveryData.state.not_working && (
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Not Working</p>
                  <p className="text-sm whitespace-pre-wrap">{discoveryData.state.not_working}</p>
                </div>
              )}
              {discoveryData.state.constraints && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Constraints</p>
                  <p className="text-sm whitespace-pre-wrap">{discoveryData.state.constraints}</p>
                </div>
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
    </div>
  );
}
