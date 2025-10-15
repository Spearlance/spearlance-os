import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCreator } from "@/components/social/PostCreator";
import { PostScheduler } from "@/components/social/PostScheduler";
import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const SocialMedia = () => {
  const { selectedClient } = useClient();

  if (!selectedClient) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to manage their social media.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Social Media</h1>
        <p className="text-muted-foreground mt-2">
          Create and schedule posts that perfectly match your brand
        </p>
      </div>

      <Tabs defaultValue="creator" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="creator">Post Creator</TabsTrigger>
          <TabsTrigger value="planner">Planner</TabsTrigger>
        </TabsList>

        <TabsContent value="creator" className="space-y-6">
          <PostCreator />
        </TabsContent>

        <TabsContent value="planner" className="space-y-6">
          <PostScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMedia;