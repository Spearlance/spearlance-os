import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Mail, Eye, Save, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject: string;
  html_body: string;
  variables: any; // Can be string[] or Json from database
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    loadTemplates();
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.template_name);
    setSubject(template.subject);
    setHtmlBody(template.html_body);
    setEditMode(false);
    setPreviewMode(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("email_templates")
        .update({
          template_name: templateName,
          subject: subject,
          html_body: htmlBody,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Template saved",
        description: "Email template updated successfully",
      });

      loadTemplates();
      setEditMode(false);
    } catch (error: any) {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPreviewHtml = () => {
    if (!selectedTemplate) return "";
    
    // Replace variables with sample data for preview
    let preview = htmlBody;
    const sampleData: Record<string, string> = {
      name: "John Doe",
      email: "john@example.com",
      password: "SecurePass123!",
      client_name: "Acme Corp",
      inviter_name: "Jane Smith",
      app_url: "https://os.spearlance.com",
      action_link: "https://os.spearlance.com/auth?token=sample",
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Email Templates</h1>
          </div>
          <p className="text-muted-foreground">Customize email templates for authentication and notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Templates
            </CardTitle>
            <CardDescription>Select a template to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="flex flex-col items-start flex-1">
                  <span>{template.template_name}</span>
                  {template.is_default && (
                    <Badge variant="secondary" className="text-xs mt-1">Default</Badge>
                  )}
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="lg:col-span-2">
          {selectedTemplate ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.template_name}</CardTitle>
                    <CardDescription>Key: {selectedTemplate.template_key}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!editMode ? (
                      <>
                        <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {previewMode ? "Hide" : "Preview"}
                        </Button>
                        {!selectedTemplate.is_default && (
                          <Button onClick={() => setEditMode(true)}>
                            Edit
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => {
                          setEditMode(false);
                          handleSelectTemplate(selectedTemplate);
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {previewMode ? (
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="mb-4 pb-4 border-b">
                      <p className="text-sm text-muted-foreground">Preview with sample data:</p>
                    </div>
                    <iframe
                      srcDoc={getPreviewHtml()}
                      className="w-full h-[600px] border-0"
                      title="Email Preview"
                    />
                  </div>
                ) : (
                  <Tabs defaultValue="content">
                    <TabsList>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="variables">Variables</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                          id="template-name"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          disabled={!editMode}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Email Subject</Label>
                        <Input
                          id="subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          disabled={!editMode}
                          placeholder="Use {{variable}} for dynamic content"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="html-body">HTML Body</Label>
                        <Textarea
                          id="html-body"
                          value={htmlBody}
                          onChange={(e) => setHtmlBody(e.target.value)}
                          disabled={!editMode}
                          rows={20}
                          className="font-mono text-sm"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="variables" className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Available Variables</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Use these variables in your subject and body by wrapping them in double curly braces: <code className="bg-background px-1 py-0.5 rounded">{'{{variable}}'}</code>
                        </p>
                        <div className="space-y-2">
                          {(Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables : []).map((variable, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                              <code className="text-sm">{`{{${variable}}}`}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(`{{${variable}}}`);
                                  toast({ title: "Copied to clipboard" });
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <Mail className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No template selected</h3>
              <p className="text-muted-foreground">Select a template from the list to start editing</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
