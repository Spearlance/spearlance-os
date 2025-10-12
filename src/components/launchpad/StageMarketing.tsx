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
  target_audience?: string;
  service_areas?: string[];
  pricing_model?: string;
  price_range?: string;
  key_benefits?: string[];
  common_objections?: string;
  ideal_client_profile?: string;
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
  const [newServiceArea, setNewServiceArea] = useState("");

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
    const { error } = await supabase
      .from("launchpad_submissions")
      .update({ 
        stage: "access",
        responses_json: {
          marketing: { services_completed: true }
        }
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

                  <div>
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Textarea
                      id="target_audience"
                      placeholder="Who is this service for?"
                      value={service.target_audience || ""}
                      onChange={(e) => updateService(service.id, { target_audience: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ideal_client_profile">Ideal Client Profile</Label>
                    <Textarea
                      id="ideal_client_profile"
                      placeholder="Describe your ideal client for this service"
                      value={service.ideal_client_profile || ""}
                      onChange={(e) => updateService(service.id, { ideal_client_profile: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pricing_model">Pricing Model</Label>
                    <Input
                      id="pricing_model"
                      placeholder="e.g., Hourly, Project-based, Monthly retainer"
                      value={service.pricing_model || ""}
                      onChange={(e) => updateService(service.id, { pricing_model: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price_range">Price Range</Label>
                    <Input
                      id="price_range"
                      placeholder="e.g., $500-$1000 or Starting at $1500"
                      value={service.price_range || ""}
                      onChange={(e) => updateService(service.id, { price_range: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Service Areas (Geographic Locations)</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {service.service_areas?.map((area, index) => (
                          <Badge key={index} variant="secondary">
                            {area}
                            <button
                              type="button"
                              className="ml-2 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const updated = service.service_areas?.filter((_, i) => i !== index);
                                updateService(service.id, { service_areas: updated });
                              }}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add location (e.g., San Francisco, CA)"
                          value={newServiceArea}
                          onChange={(e) => setNewServiceArea(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newServiceArea.trim()) {
                              e.preventDefault();
                              updateService(service.id, {
                                service_areas: [...(service.service_areas || []), newServiceArea.trim()]
                              });
                              setNewServiceArea("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (newServiceArea.trim()) {
                              updateService(service.id, {
                                service_areas: [...(service.service_areas || []), newServiceArea.trim()]
                              });
                              setNewServiceArea("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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

                  <div className="col-span-2">
                    <Label htmlFor="common_objections">Common Objections</Label>
                    <Textarea
                      id="common_objections"
                      placeholder="What concerns or objections do prospects typically have?"
                      value={service.common_objections || ""}
                      onChange={(e) => updateService(service.id, { common_objections: e.target.value })}
                      rows={3}
                    />
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
            Continue to Access
          </Button>
        </div>
      </div>
    </div>
  );
}
