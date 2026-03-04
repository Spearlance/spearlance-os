import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskTemplate {
  id: string;
  channel_name: string;
  standard_stage_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  task_type: string;
  cadence: string | null;
  owner_role: string | null;
  client_dependency: boolean;
  client_dependency_notes: string | null;
  sla_target: string | null;
  impact: string | null;
  links_required: string | null;
  created_at: string;
}

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TaskTemplate | null;
  onSuccess: () => void;
  selectedChannel?: string;
}

const CHANNELS = ['Local SEO', 'Google Ads', 'Facebook Ads', 'Website', 'Blog'];

const TASK_TYPES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'one_off', label: 'One-off' },
];

const CADENCES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const OWNER_ROLES = [
  { value: 'csm', label: 'CSM (Account Manager)' },
  { value: 'seo_specialist', label: 'SEO Specialist' },
  { value: 'ads_specialist', label: 'Ads Specialist' },
  { value: 'web_pm', label: 'Web PM' },
  { value: 'content_writer', label: 'Content Writer' },
  { value: 'designer', label: 'Designer' },
  { value: 'dev', label: 'Developer' },
];

const SLA_TARGETS = [
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
  { value: '5d', label: '5 days' },
  { value: 'next_meeting', label: 'Next Meeting' },
];

const IMPACTS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function TemplateFormDialog({ 
  open, 
  onOpenChange, 
  template, 
  onSuccess,
  selectedChannel 
}: TemplateFormDialogProps) {
  const [formData, setFormData] = useState({
    channel_name: template?.channel_name || selectedChannel || '',
    title: template?.title || '',
    description: template?.description || '',
    priority: template?.priority || 'normal',
    task_type: template?.task_type || 'one_off',
    cadence: template?.cadence || '',
    owner_role: template?.owner_role || '',
    client_dependency: template?.client_dependency || false,
    client_dependency_notes: template?.client_dependency_notes || '',
    sla_target: template?.sla_target || '',
    impact: template?.impact || 'medium',
    links_required: template?.links_required || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        channel_name: template.channel_name,
        title: template.title,
        description: template.description || '',
        priority: template.priority,
        task_type: template.task_type,
        cadence: template.cadence || '',
        owner_role: template.owner_role || '',
        client_dependency: template.client_dependency || false,
        client_dependency_notes: template.client_dependency_notes || '',
        sla_target: template.sla_target || '',
        impact: template.impact || 'medium',
        links_required: template.links_required || '',
      });
    } else {
      setFormData({
        channel_name: selectedChannel || '',
        title: '',
        description: '',
        priority: 'normal',
        task_type: 'one_off',
        cadence: '',
        owner_role: '',
        client_dependency: false,
        client_dependency_notes: '',
        sla_target: '',
        impact: 'medium',
        links_required: '',
      });
    }
  }, [template, open, selectedChannel]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.channel_name.trim() || !formData.title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    const templateData = {
      channel_name: formData.channel_name,
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority as any,
      task_type: formData.task_type,
      cadence: formData.task_type === 'recurring' ? formData.cadence || null : null,
      owner_role: formData.owner_role || null,
      client_dependency: formData.client_dependency,
      client_dependency_notes: formData.client_dependency ? formData.client_dependency_notes || null : null,
      sla_target: formData.sla_target || null,
      impact: formData.impact || null,
      links_required: formData.links_required || null,
    };
    
    if (template) {
      const { error } = await supabase
        .from('marketing_flow_task_templates')
        .update(templateData)
        .eq('id', template.id);
      
      if (error) {
        toast.error("Error updating template");
      } else {
        toast.success("Template updated successfully");
        onSuccess();
        onOpenChange(false);
      }
    } else {
      const { error } = await supabase
        .from('marketing_flow_task_templates')
        .insert({
          ...templateData,
          created_by: user.id,
        });
      
      if (error) {
        toast.error("Error creating template");
      } else {
        toast.success("Template created successfully");
        onSuccess();
        onOpenChange(false);
      }
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Channel + Task Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channel">Channel/Playbook *</Label>
              <Select 
                value={formData.channel_name} 
                onValueChange={(value) => setFormData({ ...formData, channel_name: value })}
              >
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(channel => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="task_type">Task Type *</Label>
              <Select 
                value={formData.task_type} 
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger id="task_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Cadence (conditional) + Owner Role */}
          <div className="grid grid-cols-2 gap-4">
            {formData.task_type === 'recurring' && (
              <div>
                <Label htmlFor="cadence">Cadence</Label>
                <Select 
                  value={formData.cadence} 
                  onValueChange={(value) => setFormData({ ...formData, cadence: value })}
                >
                  <SelectTrigger id="cadence">
                    <SelectValue placeholder="Select cadence" />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCES.map(cadence => (
                      <SelectItem key={cadence.value} value={cadence.value}>
                        {cadence.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className={formData.task_type !== 'recurring' ? 'col-span-2' : ''}>
              <Label htmlFor="owner_role">Owner Role</Label>
              <Select 
                value={formData.owner_role} 
                onValueChange={(value) => setFormData({ ...formData, owner_role: value })}
              >
                <SelectTrigger id="owner_role">
                  <SelectValue placeholder="Select owner role" />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Priority + Impact + SLA */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="impact">Impact</Label>
              <Select 
                value={formData.impact} 
                onValueChange={(value) => setFormData({ ...formData, impact: value })}
              >
                <SelectTrigger id="impact">
                  <SelectValue placeholder="Select impact" />
                </SelectTrigger>
                <SelectContent>
                  {IMPACTS.map(impact => (
                    <SelectItem key={impact.value} value={impact.value}>
                      {impact.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sla_target">SLA Target</Label>
              <Select 
                value={formData.sla_target} 
                onValueChange={(value) => setFormData({ ...formData, sla_target: value })}
              >
                <SelectTrigger id="sla_target">
                  <SelectValue placeholder="Select SLA" />
                </SelectTrigger>
                <SelectContent>
                  {SLA_TARGETS.map(sla => (
                    <SelectItem key={sla.value} value={sla.value}>
                      {sla.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Task Title */}
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input 
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., GBP health check, Weekly performance report"
              required
              maxLength={200}
            />
          </div>
          
          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions for what this task entails..."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Client Dependency */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="client_dependency"
                checked={formData.client_dependency}
                onCheckedChange={(checked) => setFormData({ ...formData, client_dependency: checked === true })}
              />
              <Label htmlFor="client_dependency" className="cursor-pointer">
                Requires client input/action
              </Label>
            </div>
            
            {formData.client_dependency && (
              <div>
                <Label htmlFor="client_dependency_notes">What's needed from client?</Label>
                <Input 
                  id="client_dependency_notes"
                  value={formData.client_dependency_notes}
                  onChange={(e) => setFormData({ ...formData, client_dependency_notes: e.target.value })}
                  placeholder="e.g., Need service area list from client"
                  maxLength={200}
                />
              </div>
            )}
          </div>

          {/* Links Required */}
          <div>
            <Label htmlFor="links_required">Links Required</Label>
            <Input 
              id="links_required"
              value={formData.links_required}
              onChange={(e) => setFormData({ ...formData, links_required: e.target.value })}
              placeholder="e.g., GA4, GSC, GBP, Ads accounts"
              maxLength={200}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}