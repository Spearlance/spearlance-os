import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description?: string;
  differentiators?: string;
  key_benefits?: string[];
}

interface StageMarketingProps {
  submissionId: string;
  onContinue: () => void;
  onBack: () => void;
  onSaveExit: () => void;
}

export function StageMarketing({ submissionId, onContinue, onBack, onSaveExit }: StageMarketingProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [newBenefit, setNewBenefit] = useState("");

  useEffect(() => {
    loadServices();
  }, [selectedClient]);

  const loadServices = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("client_id", selectedClient.id);

    if (error) {
      console.error("Error loading services:", error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
      return;
    }

    setServices(data || []);
    if (data && data.length > 0 && !selectedServiceId) {
      setSelectedServiceId(data[0].id);
    }
    setLoading(false);
  };

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    const { error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", serviceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      });
      return;
    }

    setServices(services.map(s => s.id === serviceId ? { ...s, ...updates } : s));
    toast({
      title: "Saved",
      description: "Service updated successfully",
    });
  };

  const handleContinue = async () => {
    // Get existing responses_json to preserve other stage data
    const { data: submissionData } = await supabase
      .from("launchpad_submissions")
      .select("responses_json")
      .eq("id", submissionId)
      .single();

    if (!submissionData) {
      toast({
        title: "Error",
        description: "Failed to load submission data",
        variant: "destructive",
      });
      return;
    }

    // Merge with existing data instead of overwriting
    const updatedResponses = {
      ...((submissionData.responses_json as Record<string, any>) || {}),
      marketing: { services_completed: true },
    };

    const { error } = await supabase
      .from("launchpad_submissions")
      .update({ 
        stage: "assets",
        responses_json: updatedResponses as any,
      })
      .eq("id", submissionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
      return;
    }

    onContinue();
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const selectedService = services.find(s => s.id === selectedServiceId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Marketing Details</h2>
          <p className="text-muted-foreground mt-1">
            Provide detailed information about your services
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Services</CardTitle>
          <CardDescription>
            Add marketing details for each service to help with campaign creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <TabsList className="mb-6">
              {services.map(service => (
                <TabsTrigger key={service.id} value={service.id}>
                  {service.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {services.map(service => (
              <TabsContent key={service.id} value={service.id} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <Label htmlFor="description">Service Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe this service in detail..."
                      value={service.description || ""}
                      onChange={(e) => updateService(service.id, { description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="differentiators">What Makes This Service Different?</Label>
                    <Textarea
                      id="differentiators"
                      placeholder="What sets you apart from competitors?"
                      value={service.differentiators || ""}
                      onChange={(e) => updateService(service.id, { differentiators: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Key Benefits</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {service.key_benefits?.map((benefit, index) => (
                          <Badge key={index} variant="secondary">
                            {benefit}
                            <button
                              type="button"
                              className="ml-2 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const updated = service.key_benefits?.filter((_, i) => i !== index);
                                updateService(service.id, { key_benefits: updated });
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a key benefit"
                          value={newBenefit}
                          onChange={(e) => setNewBenefit(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newBenefit.trim()) {
                              e.preventDefault();
                              updateService(service.id, {
                                key_benefits: [...(service.key_benefits || []), newBenefit.trim()]
                              });
                              setNewBenefit("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (newBenefit.trim()) {
                              updateService(service.id, {
                                key_benefits: [...(service.key_benefits || []), newBenefit.trim()]
                              });
                              setNewBenefit("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSaveExit}>
            Save & Exit
          </Button>
          <Button onClick={handleContinue}>
            Continue to Assets
          </Button>
        </div>
      </div>
    </div>
  );
}
