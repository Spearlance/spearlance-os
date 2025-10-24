import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, CheckCircle, Facebook, Instagram } from "lucide-react";
import { toast } from "sonner";

interface ConnectSocialAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
}

export const ConnectSocialAccountDialog = ({
  open,
  onOpenChange,
  clientId,
}: ConnectSocialAccountDialogProps) => {
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('late-create-connection-invite', {
        body: { client_id: clientId, platform },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setInviteUrl(data.invite_url);
      queryClient.invalidateQueries({ queryKey: ['late-accounts'] });
      toast.success('Invite link generated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create invite');
    },
  });

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setInviteUrl('');
    setPlatform('facebook');
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Social Account</DialogTitle>
          <DialogDescription>
            Generate a connection link to connect your social media account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!inviteUrl ? (
            <>
              <div className="space-y-3">
                <Label>Select Platform</Label>
                <RadioGroup value={platform} onValueChange={(v) => setPlatform(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="facebook" id="facebook" />
                    <Label htmlFor="facebook" className="flex items-center gap-2 cursor-pointer">
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="instagram" id="instagram" />
                    <Label htmlFor="instagram" className="flex items-center gap-2 cursor-pointer">
                      <Instagram className="h-4 w-4" />
                      Instagram Business
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={() => createInviteMutation.mutate()}
                disabled={createInviteMutation.isPending}
                className="w-full"
              >
                {createInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Connection Link
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Connection Link</Label>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly />
                  <Button onClick={handleCopyUrl} variant="outline" size="icon">
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this link with your client to connect their {platform} account. 
                  The link expires in 7 days.
                </p>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};