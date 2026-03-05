import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, FileText, Save, ArrowLeft, Copy, Home, Briefcase, Users, Phone, Image, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PromptTemplate {
  id: string;
  page_type: string;
  template_name: string;
  prompt_template: string;
  output_structure: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const PAGE_TYPE_ICONS: Record<string, any> = {
  home: Home,
  services: Briefcase,
  about: Users,
  contact: Phone,
  gallery: Image,
  landing: Target,
};

const AVAILABLE_VARIABLES = [
  { key: "business_name", description: "Client's business/brand name" },
  { key: "executive_summary", description: "Brand executive summary from marketing profile" },
  { key: "brand_voice_tone", description: "Brand voice and personality tone" },
  { key: "key_themes", description: "Key marketing themes and messaging" },
  { key: "competitive_advantages", description: "What sets the business apart" },
  { key: "primary_avatar", description: "Primary target audience description" },
  { key: "service_areas", description: "Geographic service areas" },
  { key: "page_name", description: "Name of the page being generated" },
  { key: "custom_instructions", description: "User-provided custom instructions" },
];

export default function PromptTemplates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [pageType, setPageType] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [outputStructure, setOutputStructure] = useState("");
  const [isDefault, setIsDefault] = useState(false);

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
      .maybeSingle();

    if (profile?.role !== "admin") {
      toast.error("Access Denied", { description: "You must be an admin to access this page" });
      navigate("/admin");
      return;
    }

    loadTemplates();
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("website_page_prompt_templates")
        .select("*")
        .order("page_type");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Error loading templates", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.template_name);
    setPageType(template.page_type);
    setPromptTemplate(template.prompt_template);
    setOutputStructure(JSON.stringify(template.output_structure, null, 2));
    setIsDefault(template.is_default);
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(outputStructure);
      } catch {
        toast.error("Invalid JSON", { description: "Output structure must be valid JSON" });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("website_page_prompt_templates")
        .update({
          template_name: templateName,
          page_type: pageType,
          prompt_template: promptTemplate,
          output_structure: parsedOutput,
          is_default: isDefault,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template saved", { description: "Prompt template updated successfully" });

      loadTemplates();
      setEditMode(false);
    } catch (error: any) {
      toast.error("Error saving template", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("website_page_prompt_templates")
        .insert({
          template_name: "New Template",
          page_type: "custom",
          prompt_template: "Generate content for {page_name}...",
          output_structure: { sections: [] },
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Template created");
      loadTemplates();
      if (data) handleSelectTemplate(data);
      setEditMode(true);
    } catch (error: any) {
      toast.error("Error creating template", { description: error.message });
    }
  };

  const getPageTypeIcon = (type: string) => {
    const Icon = PAGE_TYPE_ICONS[type] || FileText;
    return <Icon className="h-4 w-4" />;
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
            <h1 className="text-3xl font-bold">Prompt Templates</h1>
          </div>
          <p className="text-muted-foreground">Manage AI content generation templates for website pages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
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
                <div className="flex items-center gap-2 flex-1">
                  {getPageTypeIcon(template.page_type)}
                  <div className="flex flex-col items-start">
                    <span>{template.template_name}</span>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs mt-1">Default</Badge>
                    )}
                  </div>
                </div>
              </Button>
            ))}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleCreateTemplate}
            >
              + New Template
            </Button>
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="lg:col-span-2">
          {selectedTemplate ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getPageTypeIcon(selectedTemplate.page_type)}
                      {selectedTemplate.template_name}
                    </CardTitle>
                    <CardDescription>Page Type: {selectedTemplate.page_type}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!editMode ? (
                      <Button onClick={() => setEditMode(true)}>
                        Edit
                      </Button>
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
                <Tabs defaultValue="content">
                  <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="output">Output Structure</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                        <Label htmlFor="page-type">Page Type</Label>
                        <Select
                          value={pageType}
                          onValueChange={setPageType}
                          disabled={!editMode}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home">Home</SelectItem>
                            <SelectItem value="services">Services</SelectItem>
                            <SelectItem value="about">About</SelectItem>
                            <SelectItem value="contact">Contact</SelectItem>
                            <SelectItem value="gallery">Gallery</SelectItem>
                            <SelectItem value="landing">Landing</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-default"
                        checked={isDefault}
                        onCheckedChange={setIsDefault}
                        disabled={!editMode}
                      />
                      <Label htmlFor="is-default">Set as default for this page type</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prompt-template">Prompt Template</Label>
                      <Textarea
                        id="prompt-template"
                        value={promptTemplate}
                        onChange={(e) => setPromptTemplate(e.target.value)}
                        disabled={!editMode}
                        rows={20}
                        className="font-mono text-sm"
                        placeholder="Enter the prompt template. Use {variable_name} for dynamic content."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="variables" className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Available Variables</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use these variables in your prompt by wrapping them in curly braces: <code className="bg-background px-1 py-0.5 rounded">{'{variable_name}'}</code>
                      </p>
                      <div className="space-y-2">
                        {AVAILABLE_VARIABLES.map((variable) => (
                          <div key={variable.key} className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <code className="text-sm font-medium">{`{${variable.key}}`}</code>
                              <p className="text-xs text-muted-foreground">{variable.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`{${variable.key}}`);
                                toast.success("Copied to clipboard");
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="output" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="output-structure">Output Structure (JSON)</Label>
                      <p className="text-sm text-muted-foreground">
                        Define the expected structure of the AI-generated content
                      </p>
                      <Textarea
                        id="output-structure"
                        value={outputStructure}
                        onChange={(e) => setOutputStructure(e.target.value)}
                        disabled={!editMode}
                        rows={15}
                        className="font-mono text-sm"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No template selected</h3>
              <p className="text-muted-foreground">Select a template from the list to start editing</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}