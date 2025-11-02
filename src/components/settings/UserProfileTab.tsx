import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Key, Briefcase } from "lucide-react";

interface UserProfileTabProps {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar_url: string | null;
    job_title: string | null;
    department: string | null;
    bio: string | null;
    expertise_level: string | null;
    preferred_communication_style: string | null;
    focus_areas: string[] | null;
  };
  onProfileUpdated: () => void;
}

const FOCUS_AREA_OPTIONS = [
  "Content Marketing", "SEO", "Paid Advertising", "Social Media",
  "Email Marketing", "Analytics", "Strategy", "Branding",
  "Public Relations", "Event Marketing", "Partnerships"
];

export function UserProfileTab({ profile, onProfileUpdated }: UserProfileTabProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(profile.name || "");
  const [jobTitle, setJobTitle] = useState(profile.job_title || "");
  const [department, setDepartment] = useState(profile.department || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [expertiseLevel, setExpertiseLevel] = useState(profile.expertise_level || "intermediate");
  const [communicationStyle, setCommunicationStyle] = useState(profile.preferred_communication_style || "balanced");
  const [focusAreas, setFocusAreas] = useState<string[]>(profile.focus_areas || []);

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

  const handleSaveProfessionalDetails = async () => {
    if (bio && bio.length > 500) {
      toast({
        title: "Bio too long",
        description: "Please keep your bio under 500 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          job_title: jobTitle.trim() || null,
          department: department || null,
          bio: bio.trim() || null,
          expertise_level: expertiseLevel,
          preferred_communication_style: communicationStyle,
          focus_areas: focusAreas.length > 0 ? focusAreas : null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Professional details updated",
        description: "Your profile has been updated successfully",
      });

      onProfileUpdated();
    } catch (error) {
      console.error("Error updating professional details:", error);
      toast({
        title: "Update failed",
        description: "Failed to update your professional details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFocusArea = (area: string) => {
    setFocusAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
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

      {/* Professional Details Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Professional Details</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Help our AI assistant personalize suggestions and communication based on your role and expertise.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Owner, Admin Assistant, Operations Manager, Office Manager"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Leadership, Operations, Administration"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About Your Role</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your role, responsibilities, and focus areas..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/500 characters
            </p>
          </div>

          <div className="space-y-3">
            <Label>Marketing Expertise</Label>
            <RadioGroup value={expertiseLevel} onValueChange={setExpertiseLevel}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="beginner" id="beginner" />
                <Label htmlFor="beginner" className="font-normal cursor-pointer">
                  <span className="font-medium">Beginner</span> - New to marketing, prefer simple explanations
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="intermediate" id="intermediate" />
                <Label htmlFor="intermediate" className="font-normal cursor-pointer">
                  <span className="font-medium">Intermediate</span> - Some experience, comfortable with standard terms
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="advanced" id="advanced" />
                <Label htmlFor="advanced" className="font-normal cursor-pointer">
                  <span className="font-medium">Advanced</span> - Expert level, prefer technical details
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Communication Preference</Label>
            <RadioGroup value={communicationStyle} onValueChange={setCommunicationStyle}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="concise" id="concise" />
                <Label htmlFor="concise" className="font-normal cursor-pointer">
                  <span className="font-medium">Concise</span> - Quick bullet points and actionable items
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balanced" id="balanced" />
                <Label htmlFor="balanced" className="font-normal cursor-pointer">
                  <span className="font-medium">Balanced</span> - Mix of context and action items
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="detailed" id="detailed" />
                <Label htmlFor="detailed" className="font-normal cursor-pointer">
                  <span className="font-medium">Detailed</span> - Comprehensive explanations and background
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Focus Areas</Label>
            <p className="text-sm text-muted-foreground">
              Select areas you focus on to get more relevant suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREA_OPTIONS.map((area) => (
                <Badge
                  key={area}
                  variant={focusAreas.includes(area) ? "default" : "outline"}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => toggleFocusArea(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveProfessionalDetails} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Professional Details"}
          </Button>
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Security & Authentication</h3>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Password</h4>
            <Button variant="outline" onClick={handleChangePassword}>
              <Key className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            <p className="text-sm text-muted-foreground">
              You'll receive an email with instructions to reset your password.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Connected Accounts</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Link your Google account for easier sign-in
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.linkIdentity({
                  provider: 'google',
                });
              }}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
