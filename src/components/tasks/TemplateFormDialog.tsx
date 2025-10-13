import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TaskTemplate {
  id: string;
  channel_name: string;
  stage_name: string;
  title: string;
  description: string | null;
  priority: string;
  created_at: string;
}

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TaskTemplate | null;
  onSuccess: () => void;
}

export function TemplateFormDialog({ 
  open, 
  onOpenChange, 
  template, 
  onSuccess 
}: TemplateFormDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    stage_name: template?.stage_name || 'Attract',
    channel_name: template?.channel_name || '',
    title: template?.title || '',
    description: template?.description || '',
    priority: template?.priority || 'normal',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        stage_name: template.stage_name,
        channel_name: template.channel_name,
        title: template.title,
        description: template.description || '',
        priority: template.priority,
      });
    } else {
      setFormData({
        stage_name: 'Attract',
        channel_name: '',
        title: '',
        description: '',
        priority: 'normal',
      });
    }
  }, [template, open]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.channel_name.trim() || !formData.title.trim()) {
      toast({ 
        title: "Please fill in all required fields", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      setLoading(false);
      return;
    }
    
    if (template) {
      // Update existing template
      const { error } = await supabase
        .from('marketing_flow_task_templates')
        .update({
          stage_name: formData.stage_name,
          channel_name: formData.channel_name,
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority as any,
        })
        .eq('id', template.id);
      
      if (error) {
        toast({ title: "Error updating template", variant: "destructive" });
      } else {
        toast({ title: "Template updated successfully" });
        onSuccess();
        onOpenChange(false);
      }
    } else {
      // Create new template
      const { error } = await supabase
        .from('marketing_flow_task_templates')
        .insert({
          stage_name: formData.stage_name,
          channel_name: formData.channel_name,
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority as any,
          created_by: user.id,
        });
      
      if (error) {
        toast({ title: "Error creating template", variant: "destructive" });
      } else {
        toast({ title: "Template created successfully" });
        onSuccess();
        onOpenChange(false);
      }
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage">Stage *</Label>
              <Select 
                value={formData.stage_name} 
                onValueChange={(value) => setFormData({ ...formData, stage_name: value })}
              >
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Attract">Attract</SelectItem>
                  <SelectItem value="Engage">Engage</SelectItem>
                  <SelectItem value="Convert">Convert</SelectItem>
                  <SelectItem value="Close">Close</SelectItem>
                  <SelectItem value="Retain and Reactivate">Retain and Reactivate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority *</Label>
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
          </div>
          
          <div>
            <Label htmlFor="channel">Channel Name *</Label>
            <Input 
              id="channel"
              value={formData.channel_name}
              onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
              placeholder="e.g., Google Ads, SEO, Website"
              required
              maxLength={100}
            />
          </div>
          
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input 
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Launch campaign, Weekly review"
              required
              maxLength={200}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions for what this task entails..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.description.length}/500 characters
            </p>
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