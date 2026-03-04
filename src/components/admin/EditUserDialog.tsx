import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  KeyRound, 
  Mail, 
  Calendar, 
  Pencil, 
  User,
  Building2,
  Save,
  Loader2,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { UserActivityTab } from "./UserActivityTab";

interface EditUserDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'fmm' | 'client' | 'web_designer';
    associated_client_ids?: string[];
    cal_connected?: boolean;
    created_at: string;
    job_title?: string;
    department?: string;
    bio?: string;
    expertise_level?: string;
    preferred_communication_style?: string;
    focus_areas?: string[];
    last_login_at?: string | null;
  };
  clients: Array<{ id: string; name: string }>;
  onUserUpdated: () => void;
}

export function EditUserDialog({ user, clients, onUserUpdated }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Client access state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    user.associated_client_ids || []
  );

  // Profile details state
  const [jobTitle, setJobTitle] = useState(user.job_title || "");
  const [department, setDepartment] = useState(user.department || "");
  const [bio, setBio] = useState(user.bio || "");
  const [expertiseLevel, setExpertiseLevel] = useState(user.expertise_level || "intermediate");
  const [communicationStyle, setCommunicationStyle] = useState(
    user.preferred_communication_style || "concise"
  );
  const [focusAreas, setFocusAreas] = useState<string[]>(user.focus_areas || []);
  const [newFocusArea, setNewFocusArea] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedClientIds(user.associated_client_ids || []);
      setJobTitle(user.job_title || "");
      setDepartment(user.department || "");
      setBio(user.bio || "");
      setExpertiseLevel(user.expertise_level || "intermediate");
      setCommunicationStyle(user.preferred_communication_style || "concise");
      setFocusAreas(user.focus_areas || []);
    }
  }, [open, user]);

  const toggleClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const addFocusArea = () => {
    if (newFocusArea.trim() && !focusAreas.includes(newFocusArea.trim())) {
      setFocusAreas([...focusAreas, newFocusArea.trim()]);
      setNewFocusArea("");
    }
  };

  const removeFocusArea = (area: string) => {
    setFocusAreas(focusAreas.filter((a) => a !== area));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update client assignments
      const clientsChanged = 
        JSON.stringify(selectedClientIds.sort()) !== 
        JSON.stringify((user.associated_client_ids || []).sort());

      if (clientsChanged) {
        const { error: clientError } = await supabase.functions.invoke('admin-assign-clients', {
          body: { userId: user.id, clientIds: selectedClientIds }
        });
        if (clientError) throw clientError;
      }

      // Update profile details
      const profileUpdates = {
        job_title: jobTitle || null,
        department: department || null,
        bio: bio || null,
        expertise_level: expertiseLevel || null,
        preferred_communication_style: communicationStyle || null,
        focus_areas: focusAreas.length > 0 ? focusAreas : null,
      };

      const { error: profileError } = await supabase.functions.invoke('admin-update-user-profile', {
        body: { userId: user.id, updates: profileUpdates }
      });

      if (profileError) throw profileError;

      toast.success("User updated", { description: "User profile and access settings have been saved" });

      onUserUpdated();
      setOpen(false);
    } catch (error: any) {
      toast.error("Error saving changes", { description: error.message || "Failed to update user" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset email sent", { description: `A password reset link has been sent to ${user.email}` });
    } catch (error: any) {
      toast.error("Error sending password reset", { description: error.message });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResendInvitation = async () => {
    setIsSendingInvite(true);
    try {
      const { error } = await supabase.functions.invoke('resend-admin-invitation', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success("Invitation resent", { description: `A new invitation has been sent to ${user.email}` });
    } catch (error: any) {
      toast.error("Error resending invitation", { description: error.message });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'fmm':
        return 'secondary';
      case 'web_designer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'fmm':
        return 'FMM';
      case 'web_designer':
        return 'Web Designer';
      case 'client':
        return 'Client';
      default:
        return role.toUpperCase();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Edit user">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Manage user profile and access settings
          </DialogDescription>
        </DialogHeader>

        {/* User Header */}
        <div className="flex items-center gap-4 py-4 border-b">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Member since {format(new Date(user.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="access" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="access">Client Access</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1">
              <Activity className="h-3 w-3" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Client Access Tab */}
          <TabsContent value="access" className="space-y-4">
            <div className="space-y-2">
              <Label>Select which clients this user can access:</Label>
              <ScrollArea className="h-[200px] border rounded-md p-3">
                <div className="space-y-2">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`client-${client.id}`}
                        checked={selectedClientIds.includes(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <label
                        htmlFor={`client-${client.id}`}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{client.name}</span>
                      </label>
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No clients available
                    </p>
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </TabsContent>

          {/* Profile Details Tab */}
          <TabsContent value="profile" className="space-y-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g., Senior Designer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., Design"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A brief description about this user..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expertise Level</Label>
                  <RadioGroup
                    value={expertiseLevel}
                    onValueChange={setExpertiseLevel}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="beginner" id="beginner" />
                      <Label htmlFor="beginner" className="font-normal cursor-pointer">
                        Beginner
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="intermediate" id="intermediate" />
                      <Label htmlFor="intermediate" className="font-normal cursor-pointer">
                        Intermediate
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="expert" id="expert" />
                      <Label htmlFor="expert" className="font-normal cursor-pointer">
                        Expert
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Communication Style</Label>
                  <RadioGroup
                    value={communicationStyle}
                    onValueChange={setCommunicationStyle}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="detailed" id="detailed" />
                      <Label htmlFor="detailed" className="font-normal cursor-pointer">
                        Detailed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="concise" id="concise" />
                      <Label htmlFor="concise" className="font-normal cursor-pointer">
                        Concise
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="visual" id="visual" />
                      <Label htmlFor="visual" className="font-normal cursor-pointer">
                        Visual
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Focus Areas</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newFocusArea}
                      onChange={(e) => setNewFocusArea(e.target.value)}
                      placeholder="Add a focus area..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFocusArea())}
                    />
                    <Button type="button" variant="outline" onClick={addFocusArea}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {focusAreas.map((area) => (
                      <Badge
                        key={area}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeFocusArea(area)}
                      >
                        {area} ×
                      </Badge>
                    ))}
                    {focusAreas.length === 0 && (
                      <span className="text-xs text-muted-foreground">No focus areas added</span>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Invitation</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Resend the invitation email with login instructions.
                </p>
                <Button
                  variant="outline"
                  onClick={handleResendInvitation}
                  disabled={isSendingInvite}
                  className="w-full"
                >
                  {isSendingInvite ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Invitation
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Password Reset</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send a password reset link to the user's email.
                </p>
                <Button
                  variant="outline"
                  onClick={handlePasswordReset}
                  disabled={isSendingReset}
                  className="w-full"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Send Password Reset
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Calendar Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.cal_connected ? "default" : "outline"}>
                    {user.cal_connected ? "Connected" : "Not Connected"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {user.cal_connected
                      ? "Calendar integration is active"
                      : "User has not connected their calendar"}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <UserActivityTab userId={user.id} lastLoginAt={user.last_login_at} />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
