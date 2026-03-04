import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Search, FileText, Calendar, User, ExternalLink, Mail, Phone, CheckSquare, LayoutGrid, LayoutList, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FormSubmission {
  id: string;
  site_id: string;
  client_id: string;
  form_name: string | null;
  submitted_at: string;
  form_data: Json;
  submission_source: string | null;
  page_url: string | null;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

export default function WebsiteFormSubmissions() {
  const { selectedClient, clients, setSelectedClient } = useClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [notes, setNotes] = useState("");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    const saved = localStorage.getItem('form-submissions-view');
    return (saved as 'cards' | 'table') || 'cards';
  });

  // Auto-select client from URL parameter
  useEffect(() => {
    const clientId = searchParams.get('client');
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client && client.id !== selectedClient?.id) {
        setSelectedClient(client);
      }
    }
  }, [searchParams, clients]);

  useEffect(() => {
    if (selectedClient?.site_id) {
      fetchSubmissions();
    }
  }, [selectedClient, statusFilter]);

  const fetchSubmissions = async () => {
    if (!selectedClient?.site_id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('website_form_submissions')
        .select('*')
        .eq('site_id', selectedClient.site_id)
        .order('submitted_at', { ascending: false });

      if (statusFilter === 'active') {
        // Default view: show everything except archived
        query = query.neq('status', 'archived');
      } else if (statusFilter !== 'all') {
        // Specific status filter
        query = query.eq('status', statusFilter);
      }
      // If statusFilter === 'all', no additional filter (show everything)

      const { data, error } = await query;

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load form submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('website_form_submissions')
        .update({ status: newStatus })
        .eq('id', submissionId);

      if (error) throw error;

      setSubmissions(submissions.map(sub => 
        sub.id === submissionId ? { ...sub, status: newStatus } : sub
      ));

      // Also update selectedSubmission if it's the one being updated
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }

      toast({
        title: "Success",
        description: "Submission status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const saveNotes = async () => {
    if (!selectedSubmission) return;

    try {
      const { error } = await supabase
        .from('website_form_submissions')
        .update({ notes })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      setSubmissions(submissions.map(sub => 
        sub.id === selectedSubmission.id ? { ...sub, notes } : sub
      ));

      toast({
        title: "Success",
        description: "Notes saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    }
  };

  const openSubmissionSheet = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setNotes(submission.notes || "");

    // Mark as read when opened
    if (submission.status === 'unread') {
      updateSubmissionStatus(submission.id, 'read');
    }
  };

  const parseFormData = (formData: Json): Record<string, any> | null => {
    // If it's null or undefined, return null
    if (!formData) {
      return null;
    }

    // If it's already an object (not a string), return it
    if (typeof formData === 'object' && !Array.isArray(formData)) {
      return formData as Record<string, any>;
    }

    // If it's a string, try to parse it
    if (typeof formData === 'string') {
      try {
        const parsed = JSON.parse(formData);
        return parsed;
      } catch (error) {
        console.error('❌ Failed to parse JSON string:', error);
        return null;
      }
    }

    return null;
  };

  const getSubmitterName = (formData: Json): string => {
    const data = parseFormData(formData);
    if (!data) {
      return 'Anonymous';
    }

    // Try various name field combinations
    const nameFields = ['NAME', 'name', 'full_name', 'Full Name', 'fullName', 'fullname'];
    for (const field of nameFields) {
      const value = data[field];
      if (value) {
        const trimmed = String(value).trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    // Try first + last name combination
    const firstName = data['first_name'] || data['First Name'] || data['firstName'];
    const lastName = data['last_name'] || data['Last Name'] || data['lastName'];
    if (firstName && lastName) {
      const combined = `${String(firstName).trim()} ${String(lastName).trim()}`;
      if (combined.trim()) {
        return combined;
      }
    }
    if (firstName) {
      const trimmed = String(firstName).trim();
      if (trimmed) {
        return trimmed;
      }
    }

    // Fallback to email or anonymous
    const email = getSubmitterEmail(formData);
    return email || 'Anonymous Submission';
  };

  const getSubmitterEmail = (formData: Json): string | null => {
    const data = parseFormData(formData);
    if (!data) {
      return null;
    }
    const emailFields = ['EMAIL', 'email', 'Email', 'email_address', 'emailAddress'];

    for (const field of emailFields) {
      const value = data[field];
      if (value) {
        const trimmed = String(value).trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return null;
  };

  const getSubmitterPhone = (formData: Json): string | null => {
    const data = parseFormData(formData);
    if (!data) {
      return null;
    }
    const phoneFields = ['PHONE', 'phone', 'Phone', 'phone_number', 'phoneNumber', 'tel'];

    for (const field of phoneFields) {
      const value = data[field];
      if (value) {
        const trimmed = String(value).trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return null;
  };

  const formatFieldLabel = (key: string): string => {
    // If already has spaces and is all caps, convert to title case
    if (key.includes(' ') && key === key.toUpperCase()) {
      return key.charAt(0) + key.slice(1).toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Handle snake_case or regular formatting
    return key.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getCleanFormFields = (formData: Json): Record<string, string> => {
    const data = parseFormData(formData);
    if (!data) return {};
    
    // Get fields we're already displaying in header
    const submitterName = getSubmitterName(formData);
    const submitterEmail = getSubmitterEmail(formData);
    const submitterPhone = getSubmitterPhone(formData);
    
    const fieldsToExclude = [
      'id', 'form_title', 'date', 'site_name', 'fields'
    ];
    
    const cleanFields: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Skip excluded system fields (case-insensitive)
      if (fieldsToExclude.some(field => field.toLowerCase() === key.toLowerCase())) continue;
      
      // Skip fields already shown in header
      const valueStr = String(value).trim();
      if (!valueStr) continue;
      if (valueStr === submitterName || valueStr === submitterEmail || valueStr === submitterPhone) continue;
      
      // Skip complex objects/arrays
      if (typeof value === 'object') continue;
      
      cleanFields[key] = valueStr;
    }
    
    return cleanFields;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string }> = {
      unread: { variant: "destructive", label: "Unread" },
      read: { variant: "secondary", label: "Read" },
      responded: { variant: "default", label: "Responded" },
      archived: { variant: "outline", label: "Archived" },
    };

    const config = variants[status] || variants.read;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const formDataString = JSON.stringify(sub.form_data).toLowerCase();
    const formName = (sub.form_name || '').toLowerCase();
    
    return formDataString.includes(searchLower) || formName.includes(searchLower);
  });

  const handleViewModeChange = (mode: 'cards' | 'table') => {
    if (mode) {
      setViewMode(mode);
      localStorage.setItem('form-submissions-view', mode);
    }
  };

  const handleCreateTask = () => {
    if (!selectedSubmission) return;
    toast({
      title: "Coming Soon",
      description: "Task creation integration will be available soon",
    });
  };


  if (!selectedClient?.website_unlocked) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Website features are not enabled for this client.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedClient?.site_id) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No site ID configured for this client. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Form Submissions</h1>
          <p className="text-muted-foreground mt-1">
            Manage form submissions from your website
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle>All Submissions</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search submissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="all">All (including archived)</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="archived">Archived Only</SelectItem>
                  </SelectContent>
                </Select>
                <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
                  <ToggleGroupItem value="cards" aria-label="Card view">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Table view">
                    <LayoutList className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No form submissions yet
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubmissions.map((submission) => {
                  const submitterName = getSubmitterName(submission.form_data);
                  const submitterEmail = getSubmitterEmail(submission.form_data);
                  const submitterPhone = getSubmitterPhone(submission.form_data);
                  
                  return (
                    <Card 
                      key={submission.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => openSubmissionSheet(submission)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          {getStatusBadge(submission.status)}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-base mb-1">{submitterName}</h3>
                          {submitterEmail && (
                            <a 
                              href={`mailto:${submitterEmail}`}
                              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-3 w-3" />
                              {submitterEmail}
                            </a>
                          )}
                          {submitterPhone && (
                            <a 
                              href={`tel:${submitterPhone}`}
                              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {submitterPhone}
                            </a>
                          )}
                        </div>
                        <Badge variant="outline" className="font-normal">
                          <FileText className="h-3 w-3 mr-1" />
                          {submission.form_name || 'Contact Form'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Submitter</TableHead>
                      <TableHead>Form Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => {
                      const submitterName = getSubmitterName(submission.form_data);
                      const submitterEmail = getSubmitterEmail(submission.form_data);
                      
                      return (
                        <TableRow key={submission.id} className="hover:bg-muted/50">
                          <TableCell>{getStatusBadge(submission.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{submitterName}</span>
                              {submitterEmail && (
                                <a 
                                  href={`mailto:${submitterEmail}`}
                                  className="text-sm text-muted-foreground hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {submitterEmail}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {submission.form_name || 'Contact Form'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSubmissionSheet(submission)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedSubmission && (
            <>
              <SheetHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <SheetTitle className="text-2xl">
                      {getSubmitterName(selectedSubmission.form_data)}
                    </SheetTitle>
                    <div className="flex flex-col gap-1">
                      {getSubmitterEmail(selectedSubmission.form_data) && (
                        <a 
                          href={`mailto:${getSubmitterEmail(selectedSubmission.form_data)}`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {getSubmitterEmail(selectedSubmission.form_data)}
                        </a>
                      )}
                      {getSubmitterPhone(selectedSubmission.form_data) && (
                        <a 
                          href={`tel:${getSubmitterPhone(selectedSubmission.form_data)}`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {getSubmitterPhone(selectedSubmission.form_data)}
                        </a>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {selectedSubmission.form_name || 'Contact Form'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </span>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Quick Actions</label>
                  <div className="flex flex-wrap gap-2">
                    {getSubmitterEmail(selectedSubmission.form_data) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `mailto:${getSubmitterEmail(selectedSubmission.form_data)}`}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateTask}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Create Task
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Update Status</label>
                  <Select
                    value={selectedSubmission.status}
                    onValueChange={(value) => updateSubmissionStatus(selectedSubmission.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedSubmission.page_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={selectedSubmission.page_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline"
                    >
                      View submission page
                    </a>
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Form Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const cleanFields = getCleanFormFields(selectedSubmission.form_data);
                      const entries = Object.entries(cleanFields);
                      
                      if (entries.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            No additional form data available
                          </p>
                        );
                      }
                      
                      return entries.map(([key, value]) => {
                        const isEmail = key.toLowerCase().includes('email');
                        const isPhone = key.toLowerCase().includes('phone');
                        
                        return (
                          <div key={key} className="space-y-1">
                            <label className="text-sm font-medium">
                              {formatFieldLabel(key)}
                            </label>
                            {isEmail ? (
                              <a 
                                href={`mailto:${value}`}
                                className="block text-sm text-primary hover:underline break-words"
                              >
                                {value}
                              </a>
                            ) : isPhone ? (
                              <a 
                                href={`tel:${value}`}
                                className="block text-sm text-primary hover:underline"
                              >
                                {value}
                              </a>
                            ) : (
                              <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                                {value}
                              </p>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Internal Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes about this submission..."
                    rows={6}
                    className="resize-none"
                  />
                  <Button onClick={saveNotes} className="w-full">
                    Save Notes
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
