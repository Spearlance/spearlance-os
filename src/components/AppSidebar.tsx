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
  User,
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
  Wrench,
  Sparkles,
  BookOpen,
  Palette,
  Share2,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLaunchPadStatus } from "@/hooks/useLaunchPadStatus";
import { useAccountType } from "@/hooks/useAccountType";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Launchpad", url: "/launchpad", icon: Rocket },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Settings", url: "/settings", icon: Settings },
];

const brandContentSubItems = [
  { title: "Avatar", url: "/avatar", icon: Users },
  { title: "Brand Guide", url: "/brand/guide", icon: BookOpen },
  { title: "Mood Board", url: "/brand/moodboard", icon: Palette },
  { title: "Assets", url: "/brand/assets", icon: FolderOpen },
  { title: "Social Media", url: "/social-media", icon: Share2 },
];

const marketingSubItems = [
  { title: "Profile", url: "/marketing/profile", icon: User },
  { title: "Services", url: "/marketing/services", icon: TrendingUp },
  { title: "Ideas", url: "/marketing/ideas", icon: Lightbulb },
  { title: "Tools", url: "/marketing/tools", icon: Wrench },
  { title: "Flowchart", url: "/marketing/flowchart", icon: GitBranch },
  { title: "Reports", url: "/marketing/reports", icon: FileText },
];

const clientCommunicationSubItems = [
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "Logs", url: "/communications/logs", icon: MessageSquare },
];

const helpSupportSubItems = [
  { title: "Knowledge Base", url: "/support/docs", icon: BookOpen },
  { title: "Support Tickets", url: "/support", icon: HelpCircle },
];

const websiteSubItems = [
  { title: "Editor", icon: ExternalLink, external: true },
  { title: "Analytics", icon: TrendingUp, comingSoon: true },
  { title: "Form Submissions", icon: FileText, comingSoon: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { selectedClient, setSelectedClient, clients } = useClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [brandContentOpen, setBrandContentOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(true);
  const [clientCommunicationOpen, setClientCommunicationOpen] = useState(false);
  const [helpSupportOpen, setHelpSupportOpen] = useState(false);
  const [websiteOpen, setWebsiteOpen] = useState(false);
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
        setIsLoading(false);
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
        {!collapsed && selectedClient && clients.length > 1 && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <label className="text-xs font-medium text-sidebar-foreground/60 mb-2 block">
              Account
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

              {menuItems.slice(1, 3)
                .filter((item) => {
                  // Hide Launchpad if completed
                  if (item.title === "Launchpad" && isComplete) {
                    return false;
                  }
                  return true;
                })
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.title === "Launchpad" && !isComplete && (
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

              <Collapsible open={brandContentOpen} onOpenChange={setBrandContentOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Sparkles className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>Brand & Content</span>
                          <ChevronDown 
                            className={`ml-auto h-4 w-4 transition-transform ${
                              brandContentOpen ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {brandContentSubItems.map((subItem) => (
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

              <Collapsible open={marketingOpen} onOpenChange={setMarketingOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <TrendingUp className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>Marketing & Growth</span>
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

              {selectedClient?.website_unlocked && (
                <Collapsible open={websiteOpen} onOpenChange={setWebsiteOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <Globe className="h-4 w-4" />
                        {!collapsed && (
                          <>
                            <span>Website</span>
                            <ChevronDown 
                              className={`ml-auto h-4 w-4 transition-transform ${
                                websiteOpen ? "rotate-180" : ""
                              }`}
                            />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {websiteSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              {subItem.external && !subItem.comingSoon && selectedClient?.site_id ? (
                                <SidebarMenuSubButton asChild>
                                  <a
                                    href={`https://www.mywebsitemanager.co/home/site/${selectedClient.site_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <subItem.icon className="h-4 w-4" />
                                    <span>{subItem.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              ) : (
                                <SidebarMenuSubButton className={subItem.comingSoon ? "opacity-50 cursor-not-allowed" : ""}>
                                  <subItem.icon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                  {subItem.comingSoon && (
                                    <Badge variant="secondary" className="ml-auto text-[10px]">
                                      Soon
                                    </Badge>
                                  )}
                                </SidebarMenuSubButton>
                              )}
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {!isLoading && (
                <Collapsible open={clientCommunicationOpen} onOpenChange={setClientCommunicationOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <MessageSquare className="h-4 w-4" />
                        {!collapsed && (
                          <>
                            <span>Communication</span>
                            <ChevronDown 
                              className={`ml-auto h-4 w-4 transition-transform ${
                                clientCommunicationOpen ? "rotate-180" : ""
                              }`}
                            />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                {clientCommunicationSubItems
                  .filter((subItem) => {
                    // Hide "Logs" from non-FMM/Admin users
                    if (subItem.title === "Logs") {
                      return userRole === "admin" || userRole === "fmm";
                    }
                    return true;
                  })
                  .map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <NavLink to={subItem.url} className={getNavClass}>
                          <subItem.icon className="h-4 w-4" />
                          <span>{subItem.title}</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))
                }
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              )}

              <Collapsible open={helpSupportOpen} onOpenChange={setHelpSupportOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <HelpCircle className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>Help & Support</span>
                          <ChevronDown 
                            className={`ml-auto h-4 w-4 transition-transform ${
                              helpSupportOpen ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {helpSupportSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={subItem.url} end className={getNavClass}>
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        {userRole === "admin" && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <NavLink to="/admin/support-docs" end className={getNavClass}>
                                <BookOpen className="h-4 w-4" />
                                <span>Support Docs</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>

              {menuItems.slice(3).map((item) => (
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
