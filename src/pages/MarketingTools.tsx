import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ToolCard } from "@/components/marketing/ToolCard";
import { ToolDialog } from "@/components/marketing/ToolDialog";
import { RecommendedToolDialog } from "@/components/marketing/RecommendedToolDialog";
import { Plus, Search, Wrench, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccountType } from "@/hooks/useAccountType";

const categories = [
  { value: "all", label: "All Tools" },
  { value: "advertising", label: "Advertising" },
  { value: "design", label: "Design" },
  { value: "analytics", label: "Analytics" },
  { value: "social-media", label: "Social Media" },
  { value: "email-marketing", label: "Email Marketing" },
  { value: "seo", label: "SEO" },
  { value: "crm", label: "CRM" },
  { value: "project-management", label: "Project Management" },
  { value: "automation", label: "Automation" },
  { value: "content-creation", label: "Content Creation" },
  { value: "other", label: "Other" },
];

export default function MarketingTools() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const { hasAccess } = useAccountType();
  const [clientTools, setClientTools] = useState<any[]>([]);
  const [recommendedTools, setRecommendedTools] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [recommendedDialogOpen, setRecommendedDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<any | null>(null);
  const [editingRecommended, setEditingRecommended] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadData();
    checkUserRole();
  }, [selectedClient]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setUserRole(roleData ? 'admin' : '');
  };

  const loadData = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      await Promise.all([loadClientTools(), loadRecommendedTools()]);
    } finally {
      setLoading(false);
    }
  };

  const loadClientTools = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from('marketing_tools')
      .select('*')
      .eq('client_id', selectedClient.id)
      .order('category, name');

    if (error) throw error;
    setClientTools(data || []);
  };

  const loadRecommendedTools = async () => {
    const { data, error } = await supabase
      .from('recommended_tools')
      .select('*')
      .eq('is_active', true)
      .order('sort_order, name');

    if (error) throw error;
    setRecommendedTools(data || []);
  };

  const handleSaveClientTool = async (toolData: any) => {
    setSaving(true);
    try {
      if (toolData.id) {
        const { error } = await supabase
          .from('marketing_tools')
          .update(toolData)
          .eq('id', toolData.id);

        if (error) throw error;
        toast({ title: "Tool updated successfully" });
      } else {
        const { error } = await supabase
          .from('marketing_tools')
          .insert(toolData);

        if (error) throw error;
        toast({ title: "Tool added successfully" });
      }

      await loadClientTools();
      setToolDialogOpen(false);
      setEditingTool(null);
    } catch (error: any) {
      toast({ 
        title: "Error saving tool", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClientTool = async (toolId: string) => {
    if (!confirm("Are you sure you want to delete this tool?")) return;

    try {
      const { error } = await supabase
        .from('marketing_tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;
      
      toast({ title: "Tool deleted successfully" });
      await loadClientTools();
    } catch (error: any) {
      toast({ 
        title: "Error deleting tool", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleSaveRecommendedTool = async (toolData: any) => {
    setSaving(true);
    try {
      if (toolData.id) {
        const { error } = await supabase
          .from('recommended_tools')
          .update(toolData)
          .eq('id', toolData.id);

        if (error) throw error;
        toast({ title: "Recommended tool updated" });
      } else {
        const { error } = await supabase
          .from('recommended_tools')
          .insert(toolData);

        if (error) throw error;
        toast({ title: "Recommended tool added" });
      }

      await loadRecommendedTools();
      setRecommendedDialogOpen(false);
      setEditingRecommended(null);
    } catch (error: any) {
      toast({ 
        title: "Error saving recommended tool", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecommendedToClient = async (recommendedTool: any) => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from('marketing_tools')
        .insert({
          client_id: selectedClient.id,
          name: recommendedTool.name,
          category: recommendedTool.category,
          url: recommendedTool.url,
          logo_url: recommendedTool.logo_url,
          description: recommendedTool.description,
        });

      if (error) {
        if (error.code === '23505') {
          toast({ 
            title: "Tool already added", 
            description: `${recommendedTool.name} is already in your tools`,
            variant: "destructive" 
          });
          return;
        }
        throw error;
      }

      toast({ title: `${recommendedTool.name} added to your tools` });
      await loadClientTools();
    } catch (error: any) {
      toast({ 
        title: "Error adding tool", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleDeleteRecommendedTool = async (toolId: string) => {
    if (!confirm("Delete this recommended tool? This will remove it for all clients.")) return;

    try {
      const { error } = await supabase
        .from('recommended_tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;
      
      toast({ title: "Recommended tool deleted" });
      await loadRecommendedTools();
    } catch (error: any) {
      toast({ 
        title: "Error deleting tool", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const filterTools = (tools: any[]) => {
    let filtered = tools;
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredClientTools = filterTools(clientTools);
  const filteredRecommendedTools = filterTools(recommendedTools);

  const isAdmin = userRole === 'admin';

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-bold mb-2">Access Required</h2>
            <p className="text-muted-foreground">
              Please activate your subscription to access Marketing Tools.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Tools</h1>
          <p className="text-muted-foreground">Manage your marketing technology stack</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              onClick={() => {
                setEditingRecommended(null);
                setRecommendedDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Recommended
            </Button>
          )}
          <Button onClick={() => {
            setEditingTool(null);
            setToolDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tool
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start flex-wrap h-auto">
          {categories.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.value} value={cat.value} className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Your Tools ({filteredClientTools.length})</h2>
                  {filteredClientTools.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredClientTools.map(tool => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          type="client"
                          onEdit={() => {
                            setEditingTool(tool);
                            setToolDialogOpen(true);
                          }}
                          onDelete={() => handleDeleteClientTool(tool.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center">
                          No tools in this category yet. Add your first tool or browse recommendations below.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Recommended Tools ({filteredRecommendedTools.length})</h2>
                  {filteredRecommendedTools.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredRecommendedTools.map(tool => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          type="recommended"
                          isAdmin={isAdmin}
                          onEdit={isAdmin ? () => {
                            setEditingRecommended(tool);
                            setRecommendedDialogOpen(true);
                          } : undefined}
                          onDelete={isAdmin ? () => handleDeleteRecommendedTool(tool.id) : undefined}
                          onAddToClient={() => handleAddRecommendedToClient(tool)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <p className="text-muted-foreground">No recommended tools in this category.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ToolDialog
        open={toolDialogOpen}
        onOpenChange={setToolDialogOpen}
        tool={editingTool}
        clientId={selectedClient?.id || ''}
        onSave={handleSaveClientTool}
        loading={saving}
      />

      {isAdmin && (
        <RecommendedToolDialog
          open={recommendedDialogOpen}
          onOpenChange={setRecommendedDialogOpen}
          tool={editingRecommended}
          onSave={handleSaveRecommendedTool}
          loading={saving}
        />
      )}
    </div>
  );
}
