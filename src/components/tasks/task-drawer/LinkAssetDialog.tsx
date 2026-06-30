import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  Link as LinkIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAssetFile } from "@/lib/assetUpload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  title: string;
  type: string;
  preview_url: string | null;
  file_url: string | null;
}

interface LinkAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Asset ids already linked to the task — shown as "Linked" and not selectable. */
  linkedAssetIds: string[];
  /** Called with the chosen asset ids (existing + newly uploaded) to link them. */
  onConfirm: (assetIds: string[]) => Promise<void> | void;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "image":
      return <ImageIcon className="h-4 w-4" />;
    case "video":
      return <FileVideo className="h-4 w-4" />;
    case "audio":
      return <FileAudio className="h-4 w-4" />;
    case "doc":
    case "document":
      return <FileText className="h-4 w-4" />;
    default:
      return <LinkIcon className="h-4 w-4" />;
  }
}

export function LinkAssetDialog({
  open,
  onOpenChange,
  clientId,
  linkedAssetIds,
  onConfirm,
}: LinkAssetDialogProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linking, setLinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
      loadAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId]);

  const loadAssets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assets")
      .select("id, title, type, preview_url, file_url")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setAssets((data as Asset[]) || []);
    setLoading(false);
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newIds: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const asset = await uploadAssetFile(file, clientId, null);
        newIds.push(asset.id);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : file.name;
        toast.error("Upload failed", { description: message });
      }
    }
    setUploading(false);
    if (newIds.length > 0) {
      await loadAssets();
      // Auto-select freshly uploaded assets so they link on confirm.
      setSelectedIds((prev) => [...new Set([...prev, ...newIds])]);
      toast.success(`${newIds.length} asset(s) uploaded`);
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    setLinking(true);
    try {
      await onConfirm(selectedIds);
      onOpenChange(false);
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Assets to Task</DialogTitle>
        </DialogHeader>

        {/* Upload zone — new uploads land in the Assets library and link here */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 text-sm text-muted-foreground"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload new asset
          </Button>
          <span>or drag &amp; drop — uploads go to the Assets library and link here</span>
        </div>

        <ScrollArea className="h-[360px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No assets yet — upload one above.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {assets.map((asset) => {
                const alreadyLinked = linkedAssetIds.includes(asset.id);
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <Card
                    key={asset.id}
                    className={cn(
                      "relative transition-colors",
                      alreadyLinked
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-accent",
                      isSelected && "ring-2 ring-primary"
                    )}
                    onClick={() => !alreadyLinked && toggle(asset.id)}
                  >
                    {alreadyLinked ? (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 left-2 z-10 text-xs"
                      >
                        Linked
                      </Badge>
                    ) : (
                      <Checkbox
                        checked={isSelected}
                        className="absolute top-2 left-2 z-10 bg-background"
                      />
                    )}
                    <CardContent className="p-2">
                      {asset.preview_url ||
                      (asset.type === "image" && asset.file_url) ? (
                        <div className="w-full h-20 bg-muted rounded overflow-hidden">
                          <img
                            src={asset.preview_url || asset.file_url || ""}
                            alt={asset.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
                          {getTypeIcon(asset.type)}
                        </div>
                      )}
                      <div className="font-medium text-xs truncate mt-1">
                        {asset.title}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0 || linking}
            >
              {linking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Link {selectedIds.length || ""} asset{selectedIds.length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
