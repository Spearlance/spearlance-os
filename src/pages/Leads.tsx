import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Mail, Phone, Building, Calendar, TrendingUp, User, CheckCircle } from "lucide-react";

interface Lead {
  id: string;
  client_id: string;
  submission_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  industry: string | null;
  business_type: string | null;
  budget: string | null;
  timeline: string | null;
  pain_points: string[] | null;
  additional_notes: string | null;
  ai_summary: string | null;
  ai_score: number | null;
  urgency: string | null;
  next_action: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export default function Leads() {
  const { selectedClient } = useClient();
  const selectedClientId = selectedClient?.id;
  
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading: loading } = useQuery({
    queryKey: ['leads', selectedClientId, statusFilter, urgencyFilter],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('client_id', selectedClientId!)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (urgencyFilter !== 'all') {
        query = query.eq('urgency', urgencyFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClientId,
  });

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      queryClient.setQueryData<Lead[]>(
        ['leads', selectedClientId, statusFilter, urgencyFilter],
        (old) => old?.map(lead => lead.id === leadId ? { ...lead, status: newStatus } : lead) ?? []
      );

      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }

      toast.success('Lead status updated');
    } catch (error) {
      toast.error('Failed to update lead status');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      new: "default",
      contacted: "secondary",
      qualified: "outline",
      proposal_sent: "outline",
      won: "outline",
      lost: "destructive"
    };

    return <Badge variant={variants[status] || "default"}>{status.replace('_', ' ')}</Badge>;
  };

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null;
    
    const colors: Record<string, string> = {
      urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };

    return (
      <Badge className={colors[urgency] || ""}>{urgency}</Badge>
    );
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-sm text-muted-foreground">—</span>;
    
    let color = "text-green-600 dark:text-green-400";
    if (score < 40) color = "text-red-600 dark:text-red-400";
    else if (score < 70) color = "text-yellow-600 dark:text-yellow-400";

    return <span className={`text-sm font-semibold ${color}`}>{score}/100</span>;
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.company?.toLowerCase().includes(query) ||
      lead.industry?.toLowerCase().includes(query)
    );
  });

  const leadsByStatus = {
    new: filteredLeads.filter(l => l.status === 'new').length,
    contacted: filteredLeads.filter(l => l.status === 'contacted').length,
    qualified: filteredLeads.filter(l => l.status === 'qualified').length,
    proposal_sent: filteredLeads.filter(l => l.status === 'proposal_sent').length,
    won: filteredLeads.filter(l => l.status === 'won').length,
    lost: filteredLeads.filter(l => l.status === 'lost').length
  };

  if (!selectedClientId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please select a client to view leads</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">AI-powered lead intelligence and management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New</CardDescription>
            <CardTitle className="text-2xl">{leadsByStatus.new}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contacted</CardDescription>
            <CardTitle className="text-2xl">{leadsByStatus.contacted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-2xl">{leadsByStatus.qualified}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Proposal Sent</CardDescription>
            <CardTitle className="text-2xl">{leadsByStatus.proposal_sent}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Won</CardDescription>
            <CardTitle className="text-2xl">{leadsByStatus.won}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lost</CardDescription>
            <CardTitle className="text-2xl">{leadsByStatus.lost}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgencies</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">Loading leads...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getScoreBadge(lead.ai_score)}</TableCell>
                    <TableCell>{getUrgencyBadge(lead.urgency)}</TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>{lead.company || '—'}</TableCell>
                    <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLead(lead)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
                <SheetDescription>
                  <div className="flex flex-col gap-2 mt-2">
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Mail className="h-4 w-4" />
                      {selectedLead.email}
                    </a>
                    {selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                        <Phone className="h-4 w-4" />
                        {selectedLead.phone}
                      </a>
                    )}
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* AI Summary */}
                {selectedLead.ai_summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">AI Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedLead.ai_summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Lead Score</CardDescription>
                      <CardTitle className="text-2xl">{getScoreBadge(selectedLead.ai_score)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Urgency</CardDescription>
                      <CardTitle className="text-2xl">{getUrgencyBadge(selectedLead.urgency)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Status Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedLead.status}
                      onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Next Action */}
                {selectedLead.next_action && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Recommended Next Action
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedLead.next_action}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Business Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Business Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedLead.company && (
                      <div>
                        <label className="text-sm font-medium">Company</label>
                        <p className="text-sm text-muted-foreground">{selectedLead.company}</p>
                      </div>
                    )}
                    {selectedLead.industry && (
                      <div>
                        <label className="text-sm font-medium">Industry</label>
                        <p className="text-sm text-muted-foreground">{selectedLead.industry}</p>
                      </div>
                    )}
                    {selectedLead.business_type && (
                      <div>
                        <label className="text-sm font-medium">Business Type</label>
                        <p className="text-sm text-muted-foreground">{selectedLead.business_type}</p>
                      </div>
                    )}
                    {selectedLead.budget && (
                      <div>
                        <label className="text-sm font-medium">Budget</label>
                        <p className="text-sm text-muted-foreground">{selectedLead.budget}</p>
                      </div>
                    )}
                    {selectedLead.timeline && (
                      <div>
                        <label className="text-sm font-medium">Timeline</label>
                        <p className="text-sm text-muted-foreground">{selectedLead.timeline}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pain Points */}
                {selectedLead.pain_points && selectedLead.pain_points.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pain Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedLead.pain_points.map((point, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">{point}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Notes */}
                {selectedLead.additional_notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Additional Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedLead.additional_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
