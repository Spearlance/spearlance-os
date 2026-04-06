import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Building2, BarChart3, Loader2, Globe, KeyRound, Mail, FileText, Settings, AlertTriangle } from "lucide-react";
import { ApiErrorsTab } from "@/components/admin/ApiErrorsTab";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { EditClientDialog } from "@/components/admin/EditClientDialog";
import { Admin2FABanner } from "@/components/admin/Admin2FABanner";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { DeleteClientDialog } from "@/components/admin/DeleteClientDialog";
import { FeatureFlagManager } from "@/components/admin/FeatureFlagManager";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "fmm" | "client" | "web_designer";
  associated_client_ids?: string[];
  cal_connected?: boolean;
  created_at: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [newClientName, setNewClientName] = useState("");
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, { unread: number; total: number }>>({});

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      toast.error("Access Denied", { description: "You must be an admin to access this page" });
      navigate("/");
      return;
    }

    setUserRole(profile.role);
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("name");

      const { data: authStatusData, error: authStatusError } = await supabase.functions.invoke(
        "admin-list-user-auth-status"
      );

      if (authStatusError) throw authStatusError;

      const authStatusMap = new Map(
        (authStatusData?.users || []).map((entry: any) => [entry.id, entry])
      );

      const mergedUsers: AdminUser[] = (usersData || []).map((profile: any) => {
        const authStatus = authStatusMap.get(profile.id);
        return {
          ...profile,
          email_confirmed_at: authStatus?.email_confirmed_at ?? null,
          last_sign_in_at: authStatus?.last_sign_in_at ?? null,
        };
      });

      setUsers(mergedUsers);

      // Load clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      setClients(clientsData || []);

      // Load form submission counts
      const { data: submissionsData } = await supabase
        .from("website_form_submissions")
        .select("client_id, status");

      const counts: Record<string, { unread: number; total: number }> = {};
      submissionsData?.forEach((sub) => {
        if (!counts[sub.client_id]) {
          counts[sub.client_id] = { unread: 0, total: 0 };
        }
        counts[sub.client_id].total++;
        if (sub.status === 'unread') {
          counts[sub.client_id].unread++;
        }
      });
      setSubmissionCounts(counts);

      // Calculate stats
      const roleCount = mergedUsers.reduce((acc: any, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalUsers: mergedUsers.length || 0,
        totalClients: clientsData?.length || 0,
        roleCount: roleCount || {},
      });
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "fmm" | "client" | "web_designer") => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { userId, newRole }
      });

      if (error) throw error;

      toast.success(data?.message || "Role updated successfully");
      loadData();
    } catch (error: any) {
      toast.error("Error updating role", { description: error.message || "Failed to update user role" });
    }
  };

  const handleClientAssignment = async (userId: string, clientIds: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-assign-clients', {
        body: { userId, clientIds }
      });

      if (error) throw error;

      toast.success(data?.message || "Client assignment updated", {
        description: data?.assignedClients?.length > 0
          ? `Assigned to: ${data.assignedClients.join(', ')}`
          : undefined
      });
      loadData();
    } catch (error: any) {
      toast.error("Error updating client assignment", { description: error.message || "Failed to assign clients" });
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error("Client name is required");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-client', {
        body: { name: newClientName }
      });

      if (error) throw error;

      toast.success(data?.message || "Client created successfully", {
        description: data?.client?.front_tag ? `Front tag: ${data.client.front_tag}` : undefined
      });
      setNewClientName("");
      loadData();
    } catch (error: any) {
      toast.error("Error creating client", { description: error.message || "Failed to create client" });
    }
  };

  const handlePasswordReset = async (email: string, userName: string) => {
    try {
      const { error } = await supabase.functions.invoke('forgot-password', {
        body: { email },
      });

      if (error) throw error;

      toast.success("Password reset email sent", { description: `A password reset link has been sent to ${userName} at ${email}` });
    } catch (error: any) {
      toast.error("Error sending password reset", { description: error.message });
    }
  };

  const handleResendInvitation = async (userId: string, userEmail: string, userName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('resend-admin-invitation', {
        body: { userId }
      });

      if (error) throw error;

      toast.success("Invitation resent", { description: `A new invitation link has been sent to ${userName} at ${userEmail}` });
    } catch (error: any) {
      toast.error("Error resending invitation", { description: error.message });
    }
  };

  const getAccountState = (user: AdminUser) => {
    if (!user.email_confirmed_at) {
      return {
        label: "Setup Incomplete",
        variant: "secondary" as const,
        actionLabel: "Resend Setup Link",
        actionTitle: "Resend account setup email",
        action: () => handleResendInvitation(user.id, user.email, user.name),
      };
    }

    return {
      label: user.last_sign_in_at ? "Active" : "Confirmed",
      variant: "default" as const,
      actionLabel: "Send Password Reset",
      actionTitle: "Send password reset email",
      action: () => handlePasswordReset(user.email, user.name),
    };
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast.success("User deleted", { description: `${userName} (${userEmail}) has been permanently deleted` });
      loadData();
    } catch (error: any) {
      toast.error("Error deleting user", { description: error.message || "Failed to delete user" });
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-client', {
        body: { clientId }
      });

      if (error) throw error;

      toast.success("Client deleted", { description: `${clientName} has been permanently deleted` });
      loadData();
    } catch (error: any) {
      toast.error("Error deleting client", { description: error.message || "Failed to delete client" });
    }
  };

  if (loading || !userRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, clients, and system settings</p>
      </div>

      <Admin2FABanner />


      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="clients">Client Management</TabsTrigger>
          <TabsTrigger value="features">
            <Settings className="h-4 w-4 mr-2" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertTriangle className="h-4 w-4 mr-2" />
            API Errors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  {Object.entries(stats.roleCount || {}).map(([role, count]: any) => (
                    <div key={role}>
                      {role}: {count}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Active companies in the system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Good</div>
                <p className="text-xs text-muted-foreground mt-2">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Management</CardTitle>
                <AddUserDialog clients={clients} onUserCreated={loadData} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Assigned Clients</TableHead>
                    <TableHead>Calendar</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      {(() => {
                        const accountState = getAccountState(user);
                        return (
                          <>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as "admin" | "fmm" | "client" | "web_designer")}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="fmm">FMM</SelectItem>
                            <SelectItem value="web_designer">Web Designer</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={accountState.variant}>
                          {accountState.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.associated_client_ids?.map((clientId: string) => {
                            const client = clients.find((c) => c.id === clientId);
                            return client ? (
                              <Badge key={clientId} variant="secondary">
                                {client.name}
                              </Badge>
                            ) : null;
                          })}
                          {(!user.associated_client_ids || user.associated_client_ids.length === 0) && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.cal_connected ? (
                          <Badge variant="default">Connected</Badge>
                        ) : (
                          <Badge variant="outline">Not Connected</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={accountState.action}
                            title={accountState.actionTitle}
                          >
                            {!user.email_confirmed_at ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                          </Button>
                          <EditUserDialog user={user} clients={clients} onUserUpdated={loadData} />
                          {user.role !== 'admin' && (
                            <DeleteUserDialog
                              user={user}
                              clients={clients}
                              onConfirm={() => handleDeleteUser(user.id, user.name, user.email)}
                            />
                          )}
                        </div>
                      </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
                <Button onClick={handleCreateClient}>Create Client</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing Method</TableHead>
                    <TableHead>Booking Permissions</TableHead>
                    <TableHead>Assigned Users</TableHead>
                    <TableHead>Form Submissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const assignedUsers = users.filter((u) =>
                      u.associated_client_ids?.includes(client.id)
                    );

                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {client.logo_url ? (
                                <AvatarImage src={client.logo_url} alt={client.name} />
                              ) : (
                                <AvatarFallback className="bg-primary/10">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              {client.website_url && (
                                <a
                                  href={client.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                  <Globe className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={client.status === "active" ? "default" : "secondary"}
                          >
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.billing_method === 'stripe' && (
                            <div className="flex items-center gap-2">
                              <span>🔵 Stripe</span>
                              {client.subscription_status && (
                                <Badge variant="outline" className="text-xs">
                                  {client.subscription_status}
                                </Badge>
                              )}
                            </div>
                          )}
                          {client.billing_method === 'direct' && <span>💰 Direct</span>}
                          {client.billing_method === 'free' && <span>🎁 Free</span>}
                          {!client.billing_method && <span className="text-muted-foreground">Not set</span>}
                        </TableCell>
                        <TableCell>{client.booking_permissions || "self_book"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {assignedUsers.map((user) => (
                              <Badge key={user.id} variant="outline">
                                {user.name}
                              </Badge>
                            ))}
                            {assignedUsers.length === 0 && (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.site_id ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  navigate(`/website/form-submissions?client=${client.id}`);
                                } catch (error) {
                                  toast.error("Navigation Error", { description: "Failed to navigate to form submissions" });
                                  // Fallback to window.location
                                  window.location.href = `/website/form-submissions?client=${client.id}`;
                                }
                              }}
                              className="flex items-center gap-2 hover:bg-accent"
                            >
                              <FileText className="h-4 w-4" />
                              {submissionCounts[client.id] ? (
                                <div className="flex items-center gap-1">
                                  <span>{submissionCounts[client.id].total}</span>
                                  {submissionCounts[client.id].unread > 0 && (
                                    <Badge variant="destructive" className="h-5 px-1.5">
                                      {submissionCounts[client.id].unread}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No site ID</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EditClientDialog
                              client={client}
                              assignedUsers={assignedUsers}
                              onClientUpdated={loadData}
                            />
                            <DeleteClientDialog
                              client={client}
                              assignedUsers={assignedUsers}
                              onConfirm={() => handleDeleteClient(client.id, client.name)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flag Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Toggle application features on or off without code changes. Changes take effect immediately for all users.
              </p>
            </CardHeader>
            <CardContent>
              <FeatureFlagManager onFlagsUpdated={loadData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ApiErrorsTab clients={clients} />
        </TabsContent>

      </Tabs>
    </div>
  );
}
