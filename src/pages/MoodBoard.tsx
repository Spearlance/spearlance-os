import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Plus } from "lucide-react";
import MoodBoardGenerator from "@/components/brand/MoodBoardGenerator";
import MoodBoardGallery from "@/components/brand/MoodBoardGallery";

export default function MoodBoard() {
  const { selectedClient, loading: clientLoading } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [moodBoards, setMoodBoards] = useState<any[]>([]);
  const [brandGuide, setBrandGuide] = useState<any>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadData();
    }
  }, [selectedClient]);

  const loadData = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      // Load brand guide
      const { data: guide } = await supabase
        .from("brand_guides")
        .select("*")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      setBrandGuide(guide);

      // Load mood boards
      const { data: boards, error } = await supabase
        .from("mood_boards")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMoodBoards(boards || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load mood boards",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoodBoardCreated = () => {
    loadData();
    setShowGenerator(false);
  };

  if (clientLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">No Client Selected</h2>
          <p className="text-muted-foreground">Please select a client to view mood boards</p>
        </div>
      </div>
    );
  }

  if (!brandGuide && !showGenerator) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Brand Guide Required</CardTitle>
            <CardDescription>
              Please complete your Brand Guide before generating mood boards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/brand/guide"}>
              Go to Brand Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mood Board</h1>
          <p className="text-muted-foreground mt-1">
            Generate AI-powered visual inspiration for your brand
          </p>
        </div>
        <Button onClick={() => setShowGenerator(!showGenerator)}>
          {showGenerator ? (
            <>
              <Plus className="h-4 w-4 mr-2 rotate-45" />
              Cancel
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New
            </>
          )}
        </Button>
      </div>

      {showGenerator && (
        <div className="mb-8">
          <MoodBoardGenerator
            brandGuide={brandGuide}
            clientId={selectedClient.id}
            onComplete={handleMoodBoardCreated}
          />
        </div>
      )}

      {moodBoards.length === 0 && !showGenerator ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Mood Boards Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first mood board to visualize your brand identity
            </p>
            <Button onClick={() => setShowGenerator(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create First Mood Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <MoodBoardGallery moodBoards={moodBoards} onRefresh={loadData} />
      )}
    </div>
  );
}
