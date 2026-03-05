import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { Edit, ExternalLink, Loader2 } from "lucide-react";
import { DiscoveryData } from "@/lib/launchpadTypes";
import { useNavigate } from "react-router-dom";

interface EconomicsForm {
  aov: number | null;
  ltv: number | null;
  annual_revenue_goal: number | null;
  sales_process: string;
}

interface BusinessModelTabProps {
  discoveryData: DiscoveryData;
  economicsForm: EconomicsForm;
  setEconomicsForm: (form: EconomicsForm) => void;
  editingEconomics: boolean;
  setEditingEconomics: (editing: boolean) => void;
  savingEconomics: boolean;
  handleSaveEconomics: () => void;
}

export function BusinessModelTab({
  discoveryData,
  economicsForm,
  setEconomicsForm,
  editingEconomics,
  setEditingEconomics,
  savingEconomics,
  handleSaveEconomics,
}: BusinessModelTabProps) {
  const navigate = useNavigate();

  return (
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
          <div className="flex items-center justify-between">
            <CardTitle>Economics</CardTitle>
            {editingEconomics ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingEconomics(false);
                    setEconomicsForm({
                      aov: discoveryData.model.aov || null,
                      ltv: discoveryData.model.ltv || null,
                      annual_revenue_goal: discoveryData.goals.annual_revenue_goal || null,
                      sales_process: discoveryData.model.sales_process || ""
                    });
                  }}
                  disabled={savingEconomics}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEconomics}
                  disabled={savingEconomics}
                >
                  {savingEconomics ? (
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
                onClick={() => setEditingEconomics(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingEconomics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="aov">Average Order Value ($)</Label>
                  <Input
                    id="aov"
                    type="number"
                    value={economicsForm.aov || ""}
                    onChange={(e) => setEconomicsForm({
                      ...economicsForm,
                      aov: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="ltv">Lifetime Value ($)</Label>
                  <Input
                    id="ltv"
                    type="number"
                    value={economicsForm.ltv || ""}
                    onChange={(e) => setEconomicsForm({
                      ...economicsForm,
                      ltv: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="annual_revenue_goal">Annual Revenue Goal ($)</Label>
                  <Input
                    id="annual_revenue_goal"
                    type="number"
                    value={economicsForm.annual_revenue_goal || ""}
                    onChange={(e) => setEconomicsForm({
                      ...economicsForm,
                      annual_revenue_goal: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="sales_process">Sales Process</Label>
                <Textarea
                  id="sales_process"
                  value={economicsForm.sales_process}
                  onChange={(e) => setEconomicsForm({
                    ...economicsForm,
                    sales_process: e.target.value
                  })}
                  placeholder="Describe your sales process..."
                  rows={4}
                />
              </div>
            </div>
          ) : (
            <>
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
                {discoveryData.goals.annual_revenue_goal && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Annual Revenue Goal</p>
                    <p className="text-2xl font-bold">${discoveryData.goals.annual_revenue_goal.toLocaleString()}</p>
                  </div>
                )}
              </div>
              {discoveryData.model.sales_process && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Sales Process</p>
                  <p className="text-sm whitespace-pre-wrap">{discoveryData.model.sales_process}</p>
                </div>
              )}
              {!discoveryData.model.aov && !discoveryData.model.ltv && !discoveryData.goals.annual_revenue_goal && !discoveryData.model.sales_process && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No economics data. Click "Edit" to add details.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
