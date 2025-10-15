import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Building2, BarChart3, Loader2, Globe, KeyRound } from "lucide-react";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { UserInfoDialog } from "@/components/admin/UserInfoDialog";
import { EditClientDialog } from "@/components/admin/EditClientDialog";
import { Admin2FABanner } from "@/components/admin/Admin2FABanner";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [newClientName, setNewClientName] = useState("");

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
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
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
      setUsers(usersData || []);

      // Load clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      setClients(clientsData || []);

      // Calculate stats
      const roleCount = usersData?.reduce((acc: any, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalUsers: usersData?.length || 0,
        totalClients: clientsData?.length || 0,
        roleCount: roleCount || {},
      });
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "fmm" | "client") => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { userId, newRole }
      });

      if (error) throw error;

      toast({ title: data?.message || "Role updated successfully" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleClientAssignment = async (userId: string, clientIds: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-assign-clients', {
        body: { userId, clientIds }
      });

      if (error) throw error;

      toast({ 
        title: data?.message || "Client assignment updated",
        description: data?.assignedClients?.length > 0 
          ? `Assigned to: ${data.assignedClients.join(', ')}`
          : undefined
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating client assignment",
        description: error.message || "Failed to assign clients",
        variant: "destructive",
      });
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({
        title: "Client name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-client', {
        body: { name: newClientName }
      });

      if (error) throw error;

      toast({ 
        title: data?.message || "Client created successfully",
        description: data?.client?.front_tag ? `Front tag: ${data.client.front_tag}` : undefined
      });
      setNewClientName("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error creating client",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async (email: string, userName: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://os.spearlance.com/auth',
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: `A password reset link has been sent to ${userName} at ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending password reset",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "User deleted",
        description: `${userName} (${userEmail}) has been permanently deleted`,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
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
                    <TableHead>Assigned Clients</TableHead>
                    <TableHead>Calendar</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as "admin" | "fmm" | "client")}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="fmm">FMM</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
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
                          {user.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePasswordReset(user.email, user.name)}
                              title="Send password reset email"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <UserInfoDialog user={user} clients={clients} />
                          {user.role !== 'admin' && (
                            <DeleteUserDialog
                              user={user}
                              clients={clients}
                              onConfirm={() => handleDeleteUser(user.id, user.name, user.email)}
                            />
                          )}
                        </div>
                      </TableCell>
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
                          <EditClientDialog
                            client={client}
                            assignedUsers={assignedUsers}
                            onClientUpdated={loadData}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
