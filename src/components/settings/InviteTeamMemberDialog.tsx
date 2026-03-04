import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InviteTeamMemberDialogProps {
  clientId: string;
  canManageTeam: boolean;
  onInviteSuccess: () => void;
}

export function InviteTeamMemberDialog({ clientId, canManageTeam, onInviteSuccess }: InviteTeamMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "client" as "client" | "fmm",
  });
  const { toast } = useToast();

  // Fetch current user's role
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      return data;
    },
  });

  const isAdmin = userProfile?.role === 'admin';

  // Fetch client's billing plan and team member count
  const { data: billingData } = useQuery({
    queryKey: ['team-member-limits', clientId],
    queryFn: async () => {
      // Get client's billing plan with max_team_members
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          billing_plan_id,
          billing_plans!inner(max_team_members, name)
        `)
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Count current team members (only role='client')
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .contains('associated_client_ids', [clientId])
        .eq('role', 'client');

      if (countError) throw countError;

      return {
        maxTeamMembers: clientData?.billing_plans?.max_team_members ?? null,
        currentCount: count || 0,
        planName: clientData?.billing_plans?.name || 'Unknown Plan'
      };
    },
    enabled: !!clientId && canManageTeam,
  });

  const isAtLimit = billingData?.maxTeamMembers !== null && 
                    billingData?.currentCount >= billingData?.maxTeamMembers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          client_id: clientId,
        },
      });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `Invitation email sent to ${formData.email}`,
      });

      setFormData({ email: "", name: "", role: "client" });
      setOpen(false);
      onInviteSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to invite team member",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canManageTeam) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="member@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="John Doe"
            />
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "client" | "fmm") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Team Member</SelectItem>
                  <SelectItem value="fmm">FMM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {!isAdmin && (
            <p className="text-sm text-muted-foreground">
              Team members will be invited as Team Members
            </p>
          )}
          {billingData && (
            <Alert>
              <AlertDescription>
                {billingData.maxTeamMembers === null ? (
                  <>Your plan includes unlimited team members ({billingData.currentCount} active)</>
                ) : (
                  <>
                    Your plan includes {billingData.maxTeamMembers} team member{billingData.maxTeamMembers === 1 ? '' : 's'} 
                    ({billingData.currentCount}/{billingData.maxTeamMembers} used)
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          {isAtLimit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Team member limit reached. Please upgrade your plan to add more team members.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || isAtLimit}>
              {loading ? "Inviting..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
