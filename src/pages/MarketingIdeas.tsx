import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClient } from '@/contexts/ClientContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Lightbulb, Calendar, Tag, Plus, Search, Eye, Pencil, Copy, Trash2, X, Download, Target, StickyNote, FileText, ExternalLink, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function MarketingIdeas() {
  const { selectedClient } = useClient();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [typeSelectionDialogOpen, setTypeSelectionDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', status: '', tags: '', notes: '' });
  const [offerFormData, setOfferFormData] = useState({
    target_audience: '',
    value_proposition: '',
    deliverables: '',
    pricing: '',
    call_to_action: '',
    bonus_stack: '',
    guarantee: '',
    urgency: '',
    social_proof: ''
  });
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('');
  const [useCustomAudience, setUseCustomAudience] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['marketing-ideas', selectedClient?.id, selectedStatus, selectedTypeFilter],
    queryFn: async () => {
      if (!selectedClient) return [];
      
      let query = supabase
        .from('marketing_ideas')
        .select(`
          *,
          marketing_stage:marketing_flow_stages(id, name),
          marketing_channel:marketing_flow_channels(id, name),
          avatar:avatars(id, avatar_name)
        `)
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      if (selectedTypeFilter !== 'all') {
        query = query.eq('idea_type', selectedTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Flatten the joined data
      return (data || []).map(idea => ({
        ...idea,
        marketing_stage_name: idea.marketing_stage?.name,
        marketing_channel_name: idea.marketing_channel?.name,
        avatar_name: idea.avatar?.avatar_name
      }));
    },
    enabled: !!selectedClient,
  });

  // Query avatars for the dropdown
  const { data: avatars = [] } = useQuery({
    queryKey: ['avatars', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data } = await supabase
        .from('avatars')
        .select('id, avatar_name, ai_summary')
        .eq('client_id', selectedClient.id)
        .order('avatar_name');
      return data || [];
    },
    enabled: !!selectedClient,
  });

  // Query marketing flow data for the form
  const { data: flowData } = useQuery({
    queryKey: ['marketing-flow', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return null;
      const { data: userData } = await supabase.auth.getUser();
      const { data } = await supabase.rpc('initialize_marketing_flow', {
        p_client_id: selectedClient.id,
        p_user_id: userData.user?.id
      });
      return data;
    },
    enabled: !!selectedClient,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['marketing-stages', flowData],
    queryFn: async () => {
      if (!flowData) return [];
      const { data } = await supabase
        .from('marketing_flow_stages')
        .select('*')
        .eq('flow_id', flowData)
        .order('order_index');
      return data || [];
    },
    enabled: !!flowData,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['marketing-channels', selectedStageId],
    queryFn: async () => {
      if (!selectedStageId) return [];
      const { data } = await supabase
        .from('marketing_flow_channels')
        .select('*')
        .eq('stage_id', selectedStageId)
        .order('name');
      return data || [];
    },
    enabled: !!selectedStageId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_ideas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ideas'] });
      toast.success('Idea deleted');
      setSelectedIdea(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from('marketing_ideas').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ideas'] });
      toast.success('Idea updated');
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (idea: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('marketing_ideas').insert({
        ...idea,
        id: undefined,
        title: `${idea.title} (Copy)`,
        created_by: userData.user?.id,
        created_at: undefined,
        updated_at: undefined,
        version: idea.version + 1,
        parent_idea_id: idea.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ideas'] });
      toast.success('Idea duplicated');
    },
    onError: (error: any) => {
      toast.error('Failed to duplicate: ' + error.message);
    },
  });

  const createDraftMutation = useMutation({
    mutationFn: async (ideaType: 'offer' | 'note') => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('marketing_ideas')
        .insert({
          client_id: selectedClient.id,
          created_by: userData.user?.id,
          title: ideaType === 'offer' ? 'Untitled Offer' : 'Untitled Idea',
          status: 'draft',
          idea_type: ideaType,
          content: ideaType === 'offer' 
            ? { manual_offer: true, form_data: {}, raw_markdown: '' }
            : { notes: '' },
          offer_type: ideaType === 'offer' ? 'gso' : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ideas'] });
      toast.success(data.idea_type === 'offer' ? 'Offer draft created' : 'Idea created');
      setSelectedIdea(data);
      setTypeSelectionDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to create: ' + error.message);
    },
  });

  const convertToOfferMutation = useMutation({
    mutationFn: async (ideaId: string) => {
      const { error } = await supabase
        .from('marketing_ideas')
        .update({
          idea_type: 'offer',
          content: { manual_offer: true, form_data: {}, raw_markdown: '' },
          offer_type: 'gso'
        })
        .eq('id', ideaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ideas'] });
      toast.success('Converted to complete offer');
    },
    onError: (error: any) => {
      toast.error('Failed to convert: ' + error.message);
    },
  });

  const saveManualOfferMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!selectedIdea) throw new Error('No idea selected');
      
      // Generate markdown from form data
      const markdown = generateMarkdownFromForm(offerFormData);
      
      const { error } = await supabase
        .from('marketing_ideas')
        .update({
          content: {
            manual_offer: true,
            form_data: offerFormData,
            raw_markdown: markdown
          },
          status,
          marketing_stage_id: selectedStageId || null,
          marketing_channel_id: selectedChannelId || null,
          target_avatar_id: selectedAvatarId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedIdea.id);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ideas'] });
      toast.success(
        status === 'draft' 
          ? 'Offer saved as draft' 
          : 'Offer saved and marked as ready'
      );
      setSelectedIdea(null); // Return to list view
    },
    onError: (error: any) => {
      toast.error('Failed to save offer: ' + error.message);
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!selectedIdea) throw new Error('No idea selected');
      
      const { error } = await supabase
        .from('marketing_ideas')
        .update({
          content: { notes: noteContent },
          status,
          marketing_stage_id: selectedStageId || null,
          marketing_channel_id: selectedChannelId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedIdea.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ideas'] });
      toast.success('Idea saved');
      setSelectedIdea(null);
    },
    onError: (error: any) => {
      toast.error('Failed to save idea: ' + error.message);
    },
  });

  const handleSaveManualOffer = (status: string) => {
    saveManualOfferMutation.mutate({ status });
  };

  const generateMarkdownFromForm = (formData: any) => {
    let markdown = '';
    
    if (formData.target_audience) {
      markdown += `## Target Audience\n\n${formData.target_audience}\n\n`;
    }
    if (formData.value_proposition) {
      markdown += `## Value Proposition\n\n${formData.value_proposition}\n\n`;
    }
    if (formData.deliverables) {
      markdown += `## Deliverables\n\n${formData.deliverables}\n\n`;
    }
    if (formData.pricing) {
      markdown += `## Pricing\n\n${formData.pricing}\n\n`;
    }
    if (formData.call_to_action) {
      markdown += `## Call to Action\n\n${formData.call_to_action}\n\n`;
    }
    if (formData.bonus_stack) {
      markdown += `## Bonus Stack\n\n${formData.bonus_stack}\n\n`;
    }
    if (formData.guarantee) {
      markdown += `## Guarantee\n\n${formData.guarantee}\n\n`;
    }
    if (formData.urgency) {
      markdown += `## Urgency/Scarcity\n\n${formData.urgency}\n\n`;
    }
    if (formData.social_proof) {
      markdown += `## Social Proof\n\n${formData.social_proof}\n\n`;
    }
    
    return markdown;
  };

  const filteredIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Load form data when viewing a manual offer or note
  useEffect(() => {
    if (!selectedIdea) return;
    
    const isOffer = selectedIdea.idea_type === 'offer';
    const isNote = selectedIdea.idea_type === 'note';
    
    if (isOffer && selectedIdea.content?.form_data) {
      setOfferFormData(selectedIdea.content.form_data);
      setSelectedStageId(selectedIdea.marketing_stage_id || '');
      setSelectedChannelId(selectedIdea.marketing_channel_id || '');
      setSelectedAvatarId(selectedIdea.target_avatar_id || '');
      setUseCustomAudience(!selectedIdea.target_avatar_id);
    } else if (isOffer) {
      setOfferFormData({
        target_audience: '',
        value_proposition: '',
        deliverables: '',
        pricing: '',
        call_to_action: '',
        bonus_stack: '',
        guarantee: '',
        urgency: '',
        social_proof: ''
      });
      setSelectedStageId('');
      setSelectedChannelId('');
      setSelectedAvatarId('');
      setUseCustomAudience(true);
    } else if (isNote) {
      setNoteContent(selectedIdea.content?.notes || '');
      setSelectedStageId(selectedIdea.marketing_stage_id || '');
      setSelectedChannelId(selectedIdea.marketing_channel_id || '');
    }
  }, [selectedIdea?.id]);

  const openEditDialog = (idea: any) => {
    setEditForm({
      title: idea.title,
      status: idea.status,
      tags: idea.tags?.join(', ') || '',
      notes: idea.notes || '',
    });
    setSelectedIdea(idea);
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedIdea) return;
    updateMutation.mutate({
      id: selectedIdea.id,
      updates: {
        title: editForm.title,
        status: editForm.status,
        tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        notes: editForm.notes,
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'in_progress': return 'default';
      case 'live': return 'default';
      case 'archived': return 'secondary';
      default: return 'secondary';
    }
  };

  // Parse markdown sections dynamically using ## headers
  const parseMarkdownSections = (markdown: string) => {
    const sections: { title: string; content: string }[] = [];
    
    // Split by ## headers and extract sections
    const headerRegex = /^## (.+)$/gm;
    const matches = [...markdown.matchAll(headerRegex)];
    
    matches.forEach((match, idx) => {
      const title = match[1].trim();
      const startIdx = match.index!;
      const nextMatch = matches[idx + 1];
      const endIdx = nextMatch ? nextMatch.index! : markdown.length;
      
      const content = markdown.slice(startIdx, endIdx).trim();
      sections.push({ title, content });
    });
    
    return sections;
  };

  // Extract only the Complete Offer Score from markdown
  const extractOfferScore = (content: any) => {
    const markdown = content.raw_markdown || '';
    
    // Extract Complete Offer Score or just Offer Score
    const scoreMatch = markdown.match(/\*\*Complete Offer Score:\*\*\s*(\d+)\/100/i) ||
                      markdown.match(/\*\*Offer Score:\*\*\s*(\d+)\/100/i) ||
                      markdown.match(/Complete Offer Score:\s*(\d+)\/100/i) ||
                      markdown.match(/Offer Score:\s*(\d+)\/100/i);
    
    return scoreMatch ? scoreMatch[1] : null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const exportAsMarkdown = (idea: any) => {
    const blob = new Blob([idea.content.raw_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${idea.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown!');
  };

  if (!selectedClient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Select a Client</h2>
          <p className="text-muted-foreground">Choose a client to view their marketing ideas</p>
        </div>
      </div>
    );
  }

  if (selectedIdea) {
    const isOffer = selectedIdea.idea_type === 'offer';
    const isNote = selectedIdea.idea_type === 'note';
    const sections = parseMarkdownSections(selectedIdea.content.raw_markdown || '');
    const offerScore = extractOfferScore(selectedIdea.content);
    const offerProgress = selectedIdea.content?.offer_progress;
    const hasContent = selectedIdea.content.raw_markdown && selectedIdea.content.raw_markdown.trim() !== '';

    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedIdea(null)}>
            <X className="h-4 w-4 mr-2" />
            Back to Ideas
          </Button>
          <div className="flex gap-2">
            {hasContent && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportAsMarkdown(selectedIdea)}>
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyToClipboard(selectedIdea.content.raw_markdown)}>
                    Copy All Text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" onClick={() => openEditDialog(selectedIdea)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => duplicateMutation.mutate(selectedIdea)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedIdea.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={isOffer ? 'default' : 'secondary'}>
                    {isOffer ? '📋 Offer' : '💡 Idea'}
                  </Badge>
                  {(selectedIdea as any).avatar_name && (
                    <Badge variant="outline">
                      👤 {(selectedIdea as any).avatar_name}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl mb-2">{selectedIdea.title}</CardTitle>
                <CardDescription>
                  Created {format(new Date(selectedIdea.created_at), 'PPP')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {offerProgress && (
                  <Badge variant="outline">
                    Step {offerProgress.step}/7
                  </Badge>
                )}
                <Badge variant={getStatusColor(selectedIdea.status)}>
                  {selectedIdea.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            {selectedIdea.tags && selectedIdea.tags.length > 0 && (
              <div className="flex gap-2 mt-4">
                {selectedIdea.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {selectedIdea.notes && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Notes:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedIdea.notes}</p>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Simple Idea Form */}
        {isNote && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Idea Notes</CardTitle>
                  <CardDescription>
                    Quick notes and brainstorming
                  </CardDescription>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => convertToOfferMutation.mutate(selectedIdea.id)}
                  disabled={convertToOfferMutation.isPending}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convert to Offer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Optional Strategic Context */}
              <Accordion type="single" collapsible>
                <AccordionItem value="context">
                  <AccordionTrigger className="text-sm">
                    Link to Marketing Strategy (Optional)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Marketing Stage</Label>
                        <Select 
                          value={selectedStageId} 
                          onValueChange={setSelectedStageId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a stage..." />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((stage: any) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select 
                          value={selectedChannelId} 
                          onValueChange={setSelectedChannelId}
                          disabled={!selectedStageId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              selectedStageId ? "Choose a channel..." : "Select stage first"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {channels.map((channel: any) => (
                              <SelectItem key={channel.id} value={channel.id}>
                                {channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Notes Field */}
              <div className="space-y-2">
                <Label>Your Ideas</Label>
                <Textarea 
                  placeholder="Write your thoughts, campaign ideas, strategy notes..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={15}
                  className="font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => saveNoteMutation.mutate({ status: 'draft' })} disabled={saveNoteMutation.isPending}>
                  Save as Draft
                </Button>
                <Button variant="default" onClick={() => saveNoteMutation.mutate({ status: 'live' })} disabled={saveNoteMutation.isPending}>
                  Save & Mark Ready
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offer Builder Form */}
        {isOffer && (
          <Card>
            <CardHeader>
              <CardTitle>Build Your Offer</CardTitle>
              <CardDescription>
                Create a custom marketing offer and link it to your execution strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Strategic Context Section */}
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Where does this offer fit?
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marketing Stage</Label>
                    <Select 
                      value={selectedStageId} 
                      onValueChange={setSelectedStageId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a stage..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage: any) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select 
                      value={selectedChannelId} 
                      onValueChange={setSelectedChannelId}
                      disabled={!selectedStageId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          selectedStageId ? "Choose a channel..." : "Select stage first"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((channel: any) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            <div className="flex items-center gap-2">
                              {channel.name}
                              <Badge variant="outline" className="text-xs">
                                {channel.ownership}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Core Offer Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Audience *</Label>
                  {avatars.length > 0 ? (
                    <>
                      <Select 
                        value={useCustomAudience ? 'custom' : selectedAvatarId} 
                        onValueChange={(value) => {
                          if (value === 'custom') {
                            setUseCustomAudience(true);
                            setSelectedAvatarId('');
                          } else {
                            setUseCustomAudience(false);
                            setSelectedAvatarId(value);
                            const avatar = avatars.find(a => a.id === value);
                            if (avatar?.ai_summary) {
                              setOfferFormData({...offerFormData, target_audience: avatar.ai_summary});
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer avatar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">✏️ Write custom audience</SelectItem>
                          {avatars.map((avatar: any) => (
                            <SelectItem key={avatar.id} value={avatar.id}>
                              👤 {avatar.avatar_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!useCustomAudience && selectedAvatarId && (
                        <div className="p-3 bg-muted rounded-md text-sm">
                          {avatars.find(a => a.id === selectedAvatarId)?.ai_summary || 'No summary available'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      No customer avatars yet.
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto"
                        onClick={() => window.open('/avatar', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Create one
                      </Button>
                    </div>
                  )}
                  {(useCustomAudience || avatars.length === 0) && (
                    <Textarea 
                      placeholder="Who is this offer for? Be specific about demographics, pain points, goals..."
                      value={offerFormData.target_audience}
                      onChange={(e) => setOfferFormData({...offerFormData, target_audience: e.target.value})}
                      rows={3}
                    />
                  )}
                  {avatars.length > 0 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto"
                      onClick={() => window.open('/avatar', '_blank')}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create new avatar
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Value Proposition</Label>
                  <Textarea 
                    placeholder="What's the main promise or benefit? What transformation will they experience?"
                    value={offerFormData.value_proposition}
                    onChange={(e) => setOfferFormData({...offerFormData, value_proposition: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Deliverables</Label>
                  <Textarea 
                    placeholder="What exactly do they get? Use bullet points:
- Item 1
- Item 2
- Item 3"
                    value={offerFormData.deliverables}
                    onChange={(e) => setOfferFormData({...offerFormData, deliverables: e.target.value})}
                    rows={5}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pricing</Label>
                    <Input 
                      placeholder="$2,500/month or pricing strategy"
                      value={offerFormData.pricing}
                      onChange={(e) => setOfferFormData({...offerFormData, pricing: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Call to Action</Label>
                    <Input 
                      placeholder="Book a call, Sign up now, etc."
                      value={offerFormData.call_to_action}
                      onChange={(e) => setOfferFormData({...offerFormData, call_to_action: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Optional Enhancements - Collapsible */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="enhancements">
                  <AccordionTrigger className="px-4">
                    🎁 Optional Enhancements
                  </AccordionTrigger>
                  <AccordionContent className="px-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Bonus Stack</Label>
                      <Textarea 
                        placeholder="Additional value items, bonuses, extras..."
                        value={offerFormData.bonus_stack}
                        onChange={(e) => setOfferFormData({...offerFormData, bonus_stack: e.target.value})}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Guarantee / Risk Reversal</Label>
                      <Textarea 
                        placeholder="Money-back guarantee, trial period, warranty..."
                        value={offerFormData.guarantee}
                        onChange={(e) => setOfferFormData({...offerFormData, guarantee: e.target.value})}
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Urgency / Scarcity</Label>
                      <Input 
                        placeholder="Limited time, only 5 spots, expires Dec 31..."
                        value={offerFormData.urgency}
                        onChange={(e) => setOfferFormData({...offerFormData, urgency: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Social Proof</Label>
                      <Textarea 
                        placeholder="Testimonials, case studies, results to highlight..."
                        value={offerFormData.social_proof}
                        onChange={(e) => setOfferFormData({...offerFormData, social_proof: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedIdea(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => handleSaveManualOffer('draft')}
                  disabled={saveManualOfferMutation.isPending}
                >
                  Save Draft
                </Button>
                <Button 
                  onClick={() => handleSaveManualOffer('in_progress')}
                  disabled={saveManualOfferMutation.isPending}
                >
                  Save & Mark Ready
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card - Only showing Complete Offer Score */}
        {offerScore && (
          <Card>
            <CardHeader>
              <CardTitle>📊 Complete Offer Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{offerScore}/100</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accordion Sections - Dynamic from markdown headers */}
        {sections.length > 0 && (
          <Accordion type="multiple" defaultValue={["section-0"]} className="space-y-4">
            {sections.map((section, idx) => (
              <AccordionItem key={idx} value={`section-${idx}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>{section.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(section.content);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert pt-4">
                    <ReactMarkdown
                      components={{
                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                        h4: ({ node, ...props }) => <h4 className="text-base font-semibold mt-3 mb-2" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-3" {...props} />,
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Marketing Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Type Selection Dialog */}
      <Dialog open={typeSelectionDialogOpen} onOpenChange={setTypeSelectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What would you like to create?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto p-6 flex flex-col items-start gap-2 hover:border-primary"
              onClick={() => createDraftMutation.mutate('offer')}
              disabled={createDraftMutation.isPending}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-semibold text-lg">Complete Offer</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Build a structured offer with target audience, value prop, pricing, and more
              </p>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-6 flex flex-col items-start gap-2 hover:border-primary"
              onClick={() => createDraftMutation.mutate('note')}
              disabled={createDraftMutation.isPending}
            >
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                <span className="font-semibold text-lg">Simple Idea</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Quick notes and brainstorming - no structured fields required
              </p>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Marketing Ideas</h1>
          <p className="text-muted-foreground">Saved offers and campaign concepts for {selectedClient.name}</p>
        </div>
        <Button onClick={() => setTypeSelectionDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas by title or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Type Filter Tabs */}
      <Tabs value={selectedTypeFilter} onValueChange={setSelectedTypeFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="offer">📋 Offers</TabsTrigger>
          <TabsTrigger value="note">💡 Ideas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Ideas Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start a conversation with SpearlanceAI to build your first offer!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => {
            const offerProgress = (idea.content as any)?.offer_progress;
            return (
              <Card key={idea.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedIdea(idea)}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={idea.idea_type === 'offer' ? 'default' : 'secondary'} className="text-xs">
                        {idea.idea_type === 'offer' ? '📋 Offer' : '💡 Idea'}
                      </Badge>
                      {(idea as any).avatar_name && (
                        <Badge variant="outline" className="text-xs">
                          👤 {(idea as any).avatar_name}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{idea.title}</CardTitle>
                  </div>
                  <Badge variant={getStatusColor(idea.status)} className="ml-2 flex-shrink-0">
                    {idea.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                {/* Show stage and channel context */}
                {((idea as any).marketing_stage_name || (idea as any).marketing_channel_name) && (
                  <div className="flex gap-2 text-xs mb-2">
                    {(idea as any).marketing_stage_name && (
                      <Badge variant="secondary" className="text-xs">
                        📍 {(idea as any).marketing_stage_name}
                      </Badge>
                    )}
                    {(idea as any).marketing_channel_name && (
                      <Badge variant="outline" className="text-xs">
                        📢 {(idea as any).marketing_channel_name}
                      </Badge>
                    )}
                  </div>
                )}
                
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(idea.created_at), 'PP')}
                </CardDescription>
                {idea.tags && idea.tags.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {idea.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {idea.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{idea.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
