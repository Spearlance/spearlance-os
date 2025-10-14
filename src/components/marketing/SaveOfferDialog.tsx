import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useClient } from '@/contexts/ClientContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SaveOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: any;
  defaultTitle: string;
}

export const SaveOfferDialog = ({ open, onOpenChange, content, defaultTitle }: SaveOfferDialogProps) => {
  const { selectedClient } = useClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState(defaultTitle);
  const [status, setStatus] = useState('draft');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const offerType = 'complete_offer'; // Default to complete_offer type

  const handleSave = async () => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('marketing_ideas')
        .insert({
          client_id: selectedClient.id,
          created_by: userData.user?.id,
          title: title.trim(),
          status,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          notes: notes.trim() || null,
          offer_type: offerType,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Offer saved successfully!', {
        action: {
          label: 'View Ideas',
          onClick: () => navigate('/marketing/ideas')
        }
      });
      
      onOpenChange(false);
      setTitle('');
      setStatus('draft');
      setTags('');
      setNotes('');
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toast.error('Failed to save offer: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Complete Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q1 HVAC Tune-Up Campaign"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., hvac, paid-ads, spring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context or next steps..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
