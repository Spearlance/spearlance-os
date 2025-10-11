import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Trash2, FileText, Image, Link as LinkIcon, FileVideo, FileAudio } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssetDrawerProps {
  asset: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AssetDrawer({ asset, open, onOpenChange, onUpdate }: AssetDrawerProps) {
  const [title, setTitle] = useState(asset.title);
  const [type, setType] = useState(asset.type);
  const [fileUrl, setFileUrl] = useState(asset.file_url || "");
  const [tags, setTags] = useState(asset.tags?.join(", ") || "");
  const [relatedTasks, setRelatedTasks] = useState<any[]>([]);
  const [relatedTickets, setRelatedTickets] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (asset.id) {
      loadRelatedItems();
    }
  }, [asset.id]);

  const loadRelatedItems = async () => {
    // Load tasks that reference this asset
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status")
      .contains("related_asset_ids", [asset.id]);

    setRelatedTasks(tasks || []);

    // Load tickets that reference this asset
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, title, status")
      .contains("related_asset_ids", [asset.id]);

    setRelatedTickets(tickets || []);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("assets")
      .update({
        title,
        type,
        file_url: fileUrl,
        tags: tags.split(",").map(t => t.trim()).filter(t => t),
      })
      .eq("id", asset.id);

    if (error) {
      toast({ title: "Error updating asset", variant: "destructive" });
      return;
    }

    toast({ title: "Asset updated successfully" });
    onUpdate();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", asset.id);

    if (error) {
      toast({ title: "Error deleting asset", variant: "destructive" });
      return;
    }

    toast({ title: "Asset deleted successfully" });
    onUpdate();
    onOpenChange(false);
  };

  const getTypeIcon = (assetType: string) => {
    switch (assetType) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <FileVideo className="h-4 w-4" />;
      case "audio":
        return <FileAudio className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] w-full">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Asset Details</SheetTitle>
            {fileUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(fileUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {asset.preview_url && (
              <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                <img
                  src={asset.preview_url}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="text-sm text-muted-foreground pt-4 border-t">
              <div>Created: {new Date(asset.created_at).toLocaleString()}</div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this asset? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          <TabsContent value="usage" className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium mb-3">Related Tasks</h3>
              {relatedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks reference this asset</p>
              ) : (
                <div className="space-y-2">
                  {relatedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                      onClick={() => {
                        navigate("/tasks");
                        onOpenChange(false);
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{task.title}</div>
                      </div>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-3">Related Tickets</h3>
              {relatedTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tickets reference this asset</p>
              ) : (
                <div className="space-y-2">
                  {relatedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                      onClick={() => {
                        navigate(`/support/${ticket.id}`);
                        onOpenChange(false);
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{ticket.title}</div>
                      </div>
                      <Badge variant="outline">{ticket.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
