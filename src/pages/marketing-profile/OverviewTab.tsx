import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Edit, ExternalLink, Loader2 } from "lucide-react";
import { DiscoveryData } from "@/lib/launchpadTypes";

interface CompanyDetailsForm {
  brand_name: string;
  legal_name: string;
  website_url: string;
  industry: string;
  hq_city: string;
  service_areas: string[];
}

interface PrimaryContactForm {
  primary_contact_name: string;
  primary_contact_email: string;
}

interface OverviewTabProps {
  discoveryData: DiscoveryData;
  companyDetailsForm: CompanyDetailsForm;
  setCompanyDetailsForm: (form: CompanyDetailsForm) => void;
  editingCompanyDetails: boolean;
  setEditingCompanyDetails: (editing: boolean) => void;
  savingCompanyDetails: boolean;
  handleSaveCompanyDetails: () => void;
  primaryContactForm: PrimaryContactForm;
  setPrimaryContactForm: (form: PrimaryContactForm) => void;
  editingPrimaryContact: boolean;
  setEditingPrimaryContact: (editing: boolean) => void;
  savingPrimaryContact: boolean;
  handleSavePrimaryContact: () => void;
}

export function OverviewTab({
  discoveryData,
  companyDetailsForm,
  setCompanyDetailsForm,
  editingCompanyDetails,
  setEditingCompanyDetails,
  savingCompanyDetails,
  handleSaveCompanyDetails,
  primaryContactForm,
  setPrimaryContactForm,
  editingPrimaryContact,
  setEditingPrimaryContact,
  savingPrimaryContact,
  handleSavePrimaryContact,
}: OverviewTabProps) {
  return (
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
  );
}
