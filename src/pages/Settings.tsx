import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const { selectedClient } = useClient();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      setClient(selectedClient);
    }
  }, [selectedClient]);

  const handleSave = async () => {
    if (!client) return;

    setLoading(true);
    const { error } = await supabase
      .from("clients")
      .update({
        website_url: client.website_url,
        oviond_url: client.oviond_url,
        drive_folder_url: client.drive_folder_url,
        canva_folder_url: client.canva_folder_url,
      })
      .eq("id", client.id);

    if (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } else {
      toast({ title: "Settings saved successfully" });
    }
    setLoading(false);
  };

  if (!client) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={client.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={client.status} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={client.website_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, website_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label>Oviond URL</Label>
                <Input
                  value={client.oviond_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, oviond_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label>Drive Folder URL</Label>
                <Input
                  value={client.drive_folder_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, drive_folder_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label>Canva Folder URL</Label>
                <Input
                  value={client.canva_folder_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, canva_folder_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <Button onClick={handleSave} disabled={loading}>
                Save Bookmarks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Team management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
