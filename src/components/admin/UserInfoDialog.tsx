import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Mail, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface UserInfoDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'fmm' | 'client';
    associated_client_ids?: string[];
    cal_connected?: boolean;
    created_at: string;
    email_confirmed_at?: string | null;
  };
  clients: Array<{ id: string; name: string }>;
}

export function UserInfoDialog({ user, clients }: UserInfoDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const handlePasswordReset = async () => {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('forgot-password', {
        body: { email: user.email },
      });

      if (error) throw error;

      toast.success("Password reset email sent", { description: `A password reset link has been sent to ${user.email}` });
    } catch (error: any) {
      toast.error("Error sending password reset", { description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  const assignedClients = clients.filter(c => 
    user.associated_client_ids?.includes(c.id)
  );
  const accountIsActive = Boolean(user.email_confirmed_at);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'fmm':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <User className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>User Information</DialogTitle>
          <DialogDescription>
            View details and manage user account settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Role</p>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role.toUpperCase()}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Account Status</p>
              <Badge variant={accountIsActive ? "default" : "secondary"}>
                {accountIsActive ? "Active" : "Setup Incomplete"}
              </Badge>
            </div>

            {/* Assigned Clients */}
            <div>
              <p className="text-sm font-medium mb-2">Assigned Clients</p>
              {assignedClients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedClients.map(client => (
                    <Badge key={client.id} variant="outline">
                      {client.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No clients assigned</p>
              )}
            </div>

            {/* Calendar Status */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Calendar</p>
                <Badge variant={user.cal_connected ? "default" : "outline"}>
                  {user.cal_connected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </div>

            {/* Member Since */}
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(user.created_at), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Password Reset Action */}
          <div className="pt-4 border-t">
            <Button
              onClick={handlePasswordReset}
              disabled={isSending}
              className="w-full"
              variant="outline"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : accountIsActive ? "Send Password Reset" : "Send Setup Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
