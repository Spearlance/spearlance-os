import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Key } from "lucide-react";

interface UserProfileTabProps {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar_url: string | null;
  };
  onProfileUpdated: () => void;
}

export function UserProfileTab({ profile, onProfileUpdated }: UserProfileTabProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(profile.name || "");

  const getInitials = () => {
    if (!profile.name) return "?";
    const parts = profile.name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return profile.name.substring(0, 2).toUpperCase();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully",
      });

      onProfileUpdated();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed",
      });

      onProfileUpdated();
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast({
        title: "Error",
        description: "Failed to remove profile picture",
        variant: "destructive",
      });
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your name has been updated successfully",
      });

      onProfileUpdated();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email || "", {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Profile Picture</h3>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.name || "User"} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => document.getElementById("avatar-upload")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : profile.avatar_url ? "Change" : "Upload"}
            </Button>
            {profile.avatar_url && (
              <Button variant="outline" size="sm" onClick={handleRemoveAvatar}>
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          JPG, PNG or GIF. Max size 2MB.
        </p>
      </div>

      {/* Personal Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personal Information</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
              <Button onClick={handleSaveName} disabled={isSaving || name === profile.name}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div>
              <Badge variant="secondary" className="capitalize">
                {profile.role}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Security</h3>
        <Button variant="outline" onClick={handleChangePassword}>
          <Key className="mr-2 h-4 w-4" />
          Change Password
        </Button>
        <p className="text-sm text-muted-foreground">
          You'll receive an email with instructions to reset your password.
        </p>
      </div>
    </div>
  );
}
