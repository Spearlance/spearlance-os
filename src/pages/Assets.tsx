import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Link as LinkIcon, FileVideo, FileAudio } from "lucide-react";
import { AssetDrawer } from "@/components/assets/AssetDrawer";

interface Asset {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
  preview_url: string | null;
  tags: string[];
  created_at: string;
}

export default function Assets() {
  const { selectedClient } = useClient();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadAssets();
    }
  }, [selectedClient]);

  const loadAssets = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("client_id", selectedClient.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssets(data);
    }
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-5 w-5" />;
      case "video":
        return <FileVideo className="h-5 w-5" />;
      case "audio":
        return <FileAudio className="h-5 w-5" />;
      case "document":
        return <FileText className="h-5 w-5" />;
      default:
        return <LinkIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assets</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleAssetClick(asset)}
          >
            <CardHeader className="p-0">
              {asset.preview_url ? (
                <img
                  src={asset.preview_url}
                  alt={asset.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  {getTypeIcon(asset.type)}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{asset.title}</CardTitle>
                  <Badge variant="outline">{asset.type}</Badge>
                </div>
                
                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  Created {new Date(asset.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedAsset && (
        <AssetDrawer
          asset={selectedAsset}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onUpdate={loadAssets}
        />
      )}
    </div>
  );
}
