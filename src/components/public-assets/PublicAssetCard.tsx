import { FileText, Image, Video, Music, File, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AssetData {
  id: string;
  title: string;
  type: string;
  file_url: string;
  preview_url: string | null;
  created_at: string;
}

interface PublicAssetCardProps {
  asset: AssetData;
  viewMode: "grid" | "list";
}

const typeIcons: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  file: File,
};

export function PublicAssetCard({ asset, viewMode }: PublicAssetCardProps) {
  const Icon = typeIcons[asset.type] || File;
  
  const handleOpen = () => {
    window.open(asset.file_url, '_blank');
  };

  if (viewMode === "list") {
    return (
      <Card className="p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          {asset.type === 'image' && asset.preview_url ? (
            <div className="w-10 h-10 rounded overflow-hidden shrink-0">
              <img 
                src={asset.preview_url} 
                alt={asset.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{asset.title}</p>
            <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleOpen}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group"
      onClick={handleOpen}
    >
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {asset.type === 'image' && asset.preview_url ? (
          <img 
            src={asset.preview_url} 
            alt={asset.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <Icon className="h-12 w-12 text-muted-foreground" />
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium truncate">{asset.title}</p>
        <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
      </div>
    </Card>
  );
}
