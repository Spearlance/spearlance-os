import { useState } from 'react';
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
import { Lightbulb, Calendar, Tag, Plus, Search, Eye, Pencil, Copy, Trash2, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function MarketingIdeas() {
  const { selectedClient } = useClient();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', status: '', tags: '', notes: '' });

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['marketing-ideas', selectedClient?.id, selectedStatus],
    queryFn: async () => {
      if (!selectedClient) return [];
      
      let query = supabase
        .from('marketing_ideas')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient,
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

  const filteredIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  // Parse GSO content into sections
  const parseGSOSections = (markdown: string) => {
    const sections = {
      summary: '',
      gso_one_pager: '',
      lead_pack: '',
      money_model: '',
      scores: ''
    };
    
    const parts = markdown.split(/(?=^## )/m);
    
    parts.forEach(part => {
      if (part.includes('Strategy Snapshot') || part.includes('Quick Stats')) {
        sections.summary = part;
      } else if (part.includes('GSO') || part.includes('Offer')) {
        sections.gso_one_pager = part;
      } else if (part.includes('Lead') || part.includes('Core Four')) {
        sections.lead_pack = part;
      } else if (part.includes('Money Model') || part.includes('Funnel')) {
        sections.money_model = part;
      } else if (part.includes('Score')) {
        sections.scores = part;
      }
    });
    
    return sections;
  };

  // Extract key metrics for summary card
  const extractKeyMetrics = (content: any) => {
    const markdown = content.raw_markdown || '';
    
    return {
      offer_score: markdown.match(/Offer Score[:\s]+(\d+)/)?.[1] || 'N/A',
      price: markdown.match(/Price[:\s]+\$?([\d,]+)/)?.[1] || 'TBD',
      guarantee: markdown.match(/Guarantee[:\s]+([^\n]+)/)?.[1]?.substring(0, 50) || 'None',
      channels: (markdown.match(/Step \d+:/g) || []).length || (markdown.match(/\*\*\d+\./g) || []).length,
      bonus_count: (markdown.match(/\*\*Bonus \d+/g) || []).length,
    };
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
    const sections = parseGSOSections(selectedIdea.content.raw_markdown || '');
    const metrics = extractKeyMetrics(selectedIdea.content);

    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedIdea(null)}>
            <X className="h-4 w-4 mr-2" />
            Back to Ideas
          </Button>
          <div className="flex gap-2">
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
                <CardTitle className="text-2xl mb-2">{selectedIdea.title}</CardTitle>
                <CardDescription>
                  Created {format(new Date(selectedIdea.created_at), 'PPP')}
                </CardDescription>
              </div>
              <Badge variant={getStatusColor(selectedIdea.status)}>
                {selectedIdea.status.replace('_', ' ')}
              </Badge>
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

        {/* Summary Card - Always Visible */}
        <Card>
          <CardHeader>
            <CardTitle>📊 At-a-Glance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Offer Score</p>
                <p className="text-2xl font-bold">{metrics.offer_score}/100</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-2xl font-bold">${metrics.price}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Channels</p>
                <p className="text-2xl font-bold">{metrics.channels}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bonuses</p>
                <p className="text-2xl font-bold">{metrics.bonus_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Sections */}
        <Accordion type="multiple" defaultValue={["summary"]} className="space-y-4">
          {sections.summary && (
            <AccordionItem value="summary" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>Strategy Snapshot</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(sections.summary);
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
                    {sections.summary}
                  </ReactMarkdown>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {sections.gso_one_pager && (
            <AccordionItem value="offer" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>GSO One-Pager</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(sections.gso_one_pager);
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
                    {sections.gso_one_pager}
                  </ReactMarkdown>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {sections.lead_pack && (
            <AccordionItem value="leads" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>Lead Generation Pack</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(sections.lead_pack);
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
                    {sections.lead_pack}
                  </ReactMarkdown>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {sections.money_model && (
            <AccordionItem value="money" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>Money Model</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(sections.money_model);
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
                    {sections.money_model}
                  </ReactMarkdown>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {sections.scores && (
            <AccordionItem value="scores" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>Scores & Next Steps</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(sections.scores);
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
                    {sections.scores}
                  </ReactMarkdown>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Marketing Ideas</h1>
        <p className="text-muted-foreground">Saved offers and campaign concepts for {selectedClient.name}</p>
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
            Start a conversation with the AI assistant to build your first offer!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => (
            <Card key={idea.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedIdea(idea)}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg line-clamp-2">{idea.title}</CardTitle>
                  <Badge variant={getStatusColor(idea.status)} className="ml-2 flex-shrink-0">
                    {idea.status.replace('_', ' ')}
                  </Badge>
                </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
