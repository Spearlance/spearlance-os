import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ExternalLink, XCircle, AlertCircle, Save, User } from "lucide-react";
import { format } from "date-fns";

interface BugReportDrawerProps {
  bug: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function BugReportDrawer({ bug, open, onOpenChange, onUpdate }: BugReportDrawerProps) {
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bug) {
      setAdminNotes(bug.admin_notes || "");
    }
  }, [bug]);

  if (!bug) return null;

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "fixed") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("bug_reports")
        .update(updates)
        .eq("id", bug.id);

      if (error) throw error;

      toast({ title: "Status updated successfully" });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAwardPoints = async (points: number) => {
    try {
      const { error } = await supabase
        .from("bug_reports")
        .update({ reward_points: points, reward_awarded: true })
        .eq("id", bug.id);

      if (error) throw error;

      toast({ title: `Awarded ${points} points!`, description: "Reporter will be notified." });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bug_reports")
        .update({ admin_notes: adminNotes })
        .eq("id", bug.id);

      if (error) throw error;

      toast({ title: "Admin notes saved" });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
      cosmetic: "outline",
    };
    return colors[severity] || "default";
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      submitted: "default",
      triaged: "secondary",
      in_progress: "default",
      fixed: "default",
      wont_fix: "outline",
      duplicate: "outline",
      denied: "destructive",
    };
    return colors[status] || "default";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <SheetTitle className="text-xl">{bug.title}</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getSeverityColor(bug.severity)}>
                {bug.severity}
              </Badge>
              <Badge variant={getStatusColor(bug.status)}>
                {bug.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-200px)] mt-4">
            <TabsContent value="details" className="space-y-4">
              {/* Reporter Info */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{bug.reporter?.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">
                      {bug.reporter?.email || "No email"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{bug.client?.name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span>{format(new Date(bug.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>
              </Card>

              {/* Description */}
              <div>
                <Label className="text-base font-semibold">Description</Label>
                <p className="mt-2 text-sm">{bug.description}</p>
              </div>

              {/* Steps to Reproduce */}
              {bug.steps_to_reproduce && (
                <div>
                  <Label className="text-base font-semibold">Steps to Reproduce</Label>
                  <Card className="p-3 mt-2">
                    <p className="text-sm whitespace-pre-wrap">{bug.steps_to_reproduce}</p>
                  </Card>
                </div>
              )}

              {/* Expected Behavior */}
              {bug.expected_behavior && (
                <div>
                  <Label className="text-base font-semibold">Expected Behavior</Label>
                  <Card className="p-3 mt-2 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <p className="text-sm whitespace-pre-wrap">{bug.expected_behavior}</p>
                  </Card>
                </div>
              )}

              {/* Actual Behavior */}
              {bug.actual_behavior && (
                <div>
                  <Label className="text-base font-semibold">Actual Behavior</Label>
                  <Card className="p-3 mt-2 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                    <p className="text-sm whitespace-pre-wrap">{bug.actual_behavior}</p>
                  </Card>
                </div>
              )}

              {/* Screenshots */}
              {bug.screenshot_urls && bug.screenshot_urls.length > 0 && (
                <div>
                  <Label className="text-base font-semibold">Screenshots</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {bug.screenshot_urls.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${idx + 1}`}
                          className="w-full h-40 object-cover rounded border"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                          <ExternalLink className="h-6 w-6 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Denial Information */}
              {bug.status === 'denied' && bug.denial_reason && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Denied:</strong> {bug.denial_reason}
                    {bug.denied_at && (
                      <p className="text-xs mt-1">
                        Denied on {format(new Date(bug.denied_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              {/* Page URL */}
              {bug.page_url && (
                <div>
                  <Label className="text-base font-semibold">Page URL</Label>
                  <a
                    href={bug.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mt-2 text-sm text-primary hover:underline"
                  >
                    {bug.page_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Browser Info */}
              {bug.browser_info && (
                <div>
                  <Label className="text-base font-semibold">Browser Information</Label>
                  <Card className="p-3 mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(bug.browser_info, null, 2)}
                    </pre>
                  </Card>
                </div>
              )}

              {/* Device Info */}
              {bug.device_info && (
                <div>
                  <Label className="text-base font-semibold">Device Information</Label>
                  <Card className="p-3 mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(bug.device_info, null, 2)}
                    </pre>
                  </Card>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <Label htmlFor="admin-notes" className="text-base font-semibold">Admin Notes (Internal)</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this bug report..."
                  rows={6}
                  className="mt-2"
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  className="mt-2"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-6">
              {/* Status Update */}
              <div>
                <Label className="text-base font-semibold">Update Status</Label>
                <Select value={bug.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="triaged">Triaged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="wont_fix">Won't Fix</SelectItem>
                    <SelectItem value="duplicate">Duplicate</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Award Points */}
              {bug.status !== 'denied' && !bug.reward_awarded && (
                <div>
                  <Label className="text-base font-semibold">Award Points</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAwardPoints(5)}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      5 Points
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAwardPoints(15)}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      15 Points
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAwardPoints(30)}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      30 Points
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAwardPoints(50)}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      50 Points
                    </Button>
                  </div>
                </div>
              )}

              {bug.reward_awarded && (
                <Alert>
                  <Trophy className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Points Awarded:</strong> {bug.reward_points} points
                  </AlertDescription>
                </Alert>
              )}

              {/* Info about rewards */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Points Guidelines:</strong>
                  <ul className="list-disc ml-4 mt-1 space-y-1">
                    <li>5 pts: Minor cosmetic issues</li>
                    <li>15 pts: Low priority functional bugs</li>
                    <li>30 pts: Medium priority bugs affecting features</li>
                    <li>50 pts: High/Critical bugs or excellent reporting</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
