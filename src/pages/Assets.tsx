import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Image, Video, Link as LinkIcon, File } from "lucide-react";

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
  const { toast } = useToast();

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

    if (error) {
      toast({ title: "Error loading assets", variant: "destructive" });
      return;
    }

    setAssets(data || []);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <Image className="h-5 w-5" />;
      case "video": return <Video className="h-5 w-5" />;
      case "doc": return <FileText className="h-5 w-5" />;
      case "link": return <LinkIcon className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assets</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="h-48 bg-muted flex items-center justify-center">
              {asset.preview_url ? (
                <img 
                  src={asset.preview_url} 
                  alt={asset.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground">
                  {getTypeIcon(asset.type)}
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium line-clamp-2">{asset.title}</h3>
                <Badge variant="outline" className="shrink-0">
                  {asset.type}
                </Badge>
              </div>
              <div className="flex gap-1 flex-wrap">
                {asset.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(asset.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
