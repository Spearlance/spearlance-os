import { NavLink, useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  Calendar,
  CheckSquare,
  FolderOpen,
  Users,
  Rocket,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Assets", url: "/assets", icon: FolderOpen },
  { title: "Avatar", url: "/avatar", icon: Users },
  { title: "Launch Pad", url: "/launchpad", icon: Rocket },
  { title: "Support", url: "/support", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { selectedClient, setSelectedClient, clients } = useClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">Spearlance</span>
          </div>
        )}
        <SidebarTrigger className="text-sidebar-foreground" />
      </div>

      <SidebarContent>
        {!collapsed && selectedClient && clients.length > 0 && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <label className="text-xs font-medium text-sidebar-foreground/60 mb-2 block">
              Client
            </label>
            <Select
              value={selectedClient.id}
              onValueChange={(value) => {
                const client = clients.find((c) => c.id === value);
                if (client) setSelectedClient(client);
              }}
            >
              <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
