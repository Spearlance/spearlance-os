import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Users, CreditCard, Plug, LogOut } from "lucide-react";
import { toast } from "sonner";

export function UserProfileDropdown() {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, email, role, avatar_url")
          .eq("id", user.id)
          .single();
        
        setUserProfile(profile);

        // Check if user is a primary contact for the selected client
        if (selectedClient) {
          const { data: primaryContact } = await supabase
            .from("client_primary_contacts")
            .select("id")
            .eq("client_id", selectedClient.id)
            .eq("user_id", user.id)
            .single();
          
          setIsPrimaryContact(!!primaryContact);
        }
      }
    };

    fetchUserProfile();
  }, [selectedClient]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      toast.error("Error", { description: "Failed to sign out" });
    }
  };

  const getInitials = () => {
    if (!userProfile?.name) return "U";
    const parts = userProfile.name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return userProfile.name[0].toUpperCase();
  };

  const canViewBilling = userProfile?.role === 'admin' || (userProfile?.role === 'client' && isPrimaryContact);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings?tab=profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        {selectedClient && (
          <DropdownMenuItem onClick={() => navigate("/settings?tab=team")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Team</span>
          </DropdownMenuItem>
        )}
        {selectedClient && canViewBilling && (
          <DropdownMenuItem onClick={() => navigate("/settings?tab=billing")}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings?tab=integrations")}>
          <Plug className="mr-2 h-4 w-4" />
          <span>Integrations</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
