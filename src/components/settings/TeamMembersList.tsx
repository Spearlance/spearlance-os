import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, KeyRound } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  is_primary_contact?: boolean;
}

interface TeamMembersListProps {
  clientId: string;
  canManageTeam: boolean;
  refreshTrigger?: number;
  userProfile?: any;
}

export function TeamMembersList({ clientId, canManageTeam, refreshTrigger, userProfile }: TeamMembersListProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const getRoleDisplay = (role: string) => {
    if (role === 'admin') return 'ADMIN';
    if (role === 'fmm') return 'FMM';
    return 'TEAM MEMBER';
  };

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at")
        .contains("associated_client_ids", [clientId])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check which users are primary contacts
      const { data: primaryContacts } = await supabase
        .from("client_primary_contacts")
        .select("user_id")
        .eq("client_id", clientId);

      const primaryContactIds = new Set(primaryContacts?.map(pc => pc.user_id) || []);

      const membersWithPrimaryStatus = (data || []).map(member => ({
        ...member,
        is_primary_contact: primaryContactIds.has(member.id),
      }));

      setTeamMembers(membersWithPrimaryStatus);
    } catch (error: any) {
      toast.error("Error loading team members", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [clientId, refreshTrigger]);

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      
      // Prevent removing yourself
      if (user?.id === memberId) {
        toast.error("Cannot remove yourself", { description: "You cannot remove your own account from the team" });
        return;
      }

      // Remove the client from the user's associated_client_ids
      const { data: profile } = await supabase
        .from("profiles")
        .select("associated_client_ids")
        .eq("id", memberId)
        .maybeSingle();

      if (profile) {
        const updatedClientIds = (profile.associated_client_ids || []).filter(
          (id: string) => id !== clientId
        );

        const { error } = await supabase
          .from("profiles")
          .update({ associated_client_ids: updatedClientIds })
          .eq("id", memberId);

        if (error) throw error;

        toast.success("Team member removed", { description: `${memberName} has been removed from the team` });

        fetchTeamMembers();
      }
    } catch (error: any) {
      toast.error("Failed to remove team member", { description: error.message });
    }
  };

  const handlePasswordReset = async (email: string, memberName: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset sent", { description: `Password reset link has been sent to ${memberName}` });
    } catch (error: any) {
      toast.error("Failed to send password reset", { description: error.message });
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading team members...</p>;
  }

  if (teamMembers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No team members yet. Invite your first team member to get started.
      </p>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {getRoleDisplay(member.role)}
                  </Badge>
                  {member.is_primary_contact && (
                    <Badge variant="outline" className="bg-primary/10">
                      PRIMARY CONTACT
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
              {canManageTeam && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {member.role === "client" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePasswordReset(member.email, member.name)}
                        title="Send password reset"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    )}
                    {member.role !== "admin" && 
                     !(member.is_primary_contact && userProfile?.role === 'client') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove team member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.name} from this client? They will
                              lose access to all client data and settings.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
