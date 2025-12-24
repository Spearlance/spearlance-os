import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Service {
  id: string;
  name: string;
  description?: string;
  differentiators?: string;
  key_benefits?: string[];
}

export default function Marketing() {
  const { selectedClient } = useClient();
  const { setSaveStatus } = useSaveStatus();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [newBenefit, setNewBenefit] = useState("");

  useEffect(() => {
    if (selectedClient) {
      loadServices();
    }
  }, [selectedClient]);

  const loadServices = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("client_id", selectedClient.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading services:", error);
      setSaveStatus('error', "Failed to load services");
      setLoading(false);
      return;
    }

    setServices(data || []);
    if (data && data.length > 0 && !selectedServiceId) {
      setSelectedServiceId(data[0].id);
    }
    setLoading(false);
  };

  const addService = async () => {
    if (!selectedClient || !newServiceName.trim()) return;

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("services")
      .insert({
        client_id: selectedClient.id,
        name: newServiceName.trim(),
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (error) {
      setSaveStatus('error', "Failed to add service");
      return;
    }

    setServices([...services, data]);
    setSelectedServiceId(data.id);
    setNewServiceName("");
    setShowAddService(false);
    setSaveStatus('saved');
  };

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    const { error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", serviceId);

    if (error) {
      setSaveStatus('error', "Failed to update service");
      return;
    }

    setServices(services.map(s => s.id === serviceId ? { ...s, ...updates } : s));
    setSaveStatus('saved');
  };

  const deleteService = async (serviceId: string) => {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (error) {
      setSaveStatus('error', "Failed to delete service");
      return;
    }

    const updatedServices = services.filter(s => s.id !== serviceId);
    setServices(updatedServices);
    if (selectedServiceId === serviceId && updatedServices.length > 0) {
      setSelectedServiceId(updatedServices[0].id);
    }
    setDeleteServiceId(null);
    setSaveStatus('saved');
  };

  const selectedService = services.find(s => s.id === selectedServiceId);

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6 text-center">
          <CardTitle className="mb-2">No Client Selected</CardTitle>
          <CardDescription>Please select a client to manage marketing</CardDescription>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">Manage services and marketing details</p>
        </div>
        <Button onClick={() => setShowAddService(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {showAddService && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Add New Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Service name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addService();
                  }
                }}
              />
              <Button onClick={addService}>Add</Button>
              <Button variant="outline" onClick={() => {
                setShowAddService(false);
                setNewServiceName("");
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No services yet</p>
            <Button onClick={() => setShowAddService(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Manage detailed information about your services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <div className="flex items-center justify-between mb-6">
                <TabsList>
                  {services.map(service => (
                    <TabsTrigger key={service.id} value={service.id}>
                      {service.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {selectedService && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteServiceId(selectedService.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              {services.map(service => (
                <TabsContent key={service.id} value={service.id} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Service Name</Label>
                      <Input
                        id="name"
                        value={service.name}
                        onChange={(e) => updateService(service.id, { name: e.target.value })}
                      />
                    </div>

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
                            size="sm"
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
      )}

      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this service and all its details. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteServiceId && deleteService(deleteServiceId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
