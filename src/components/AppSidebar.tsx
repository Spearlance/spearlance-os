import { NavLink, useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Shield,
  TrendingUp,
  GitBranch,
  ChevronDown,
  FileText,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLaunchPadStatus } from "@/hooks/useLaunchPadStatus";
import { useAccountType } from "@/hooks/useAccountType";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Launch Pad", url: "/launchpad", icon: Rocket },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Assets", url: "/assets", icon: FolderOpen },
  { title: "Avatar", url: "/avatar", icon: Users },
  { title: "Support", url: "/support", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

  const marketingSubItems = [
    { title: "Services", url: "/marketing/services", icon: TrendingUp },
    { title: "Ideas", url: "/marketing/ideas", icon: Lightbulb },
    { title: "Flowchart", url: "/marketing/flowchart", icon: GitBranch },
    { title: "Reports", url: "/marketing/reports", icon: FileText },
  ];

const communicationsSubItems = [
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "Logs", url: "/communications/logs", icon: MessageSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { selectedClient, setSelectedClient, clients } = useClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [marketingOpen, setMarketingOpen] = useState(true);
  const [communicationsOpen, setCommunicationsOpen] = useState(false);
  const { isComplete } = useLaunchPadStatus();
  const { isSelfService } = useAccountType();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setUserRole(profile?.role || "");
      }
    };
    fetchUserRole();
  }, []);

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
            <img 
              src="https://irp.cdn-website.com/e8531a5e/dms3rep/multi/Asset+1.svg" 
              alt="Spearlance Logo"
              className="h-6 w-auto"
            />
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
              {menuItems.slice(0, 1).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {!isSelfService && (userRole === 'admin' || userRole === 'fmm') && (
                <Collapsible open={communicationsOpen} onOpenChange={setCommunicationsOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <MessageSquare className="h-4 w-4" />
                        {!collapsed && (
                          <>
                            <span>Communications</span>
                            <ChevronDown 
                              className={`ml-auto h-4 w-4 transition-transform ${
                                communicationsOpen ? "rotate-180" : ""
                              }`}
                            />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {communicationsSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={subItem.url} className={getNavClass}>
                                  <subItem.icon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {menuItems.slice(1, 5).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.title === "Launch Pad" && !isComplete && (
                            <Badge 
                              variant="destructive" 
                              className="h-2 w-2 p-0 rounded-full"
                              aria-label="Incomplete"
                            >
                              <span className="sr-only">Incomplete</span>
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible open={marketingOpen} onOpenChange={setMarketingOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <TrendingUp className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>Marketing</span>
                          <ChevronDown 
                            className={`ml-auto h-4 w-4 transition-transform ${
                              marketingOpen ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {marketingSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={subItem.url} end className={getNavClass}>
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>

              {menuItems.slice(5).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {userRole === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" end className={getNavClass}>
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
