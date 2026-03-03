import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { CompetitorDialog } from "@/components/competitors/CompetitorDialog";
import { CompetitorCard } from "@/components/competitors/CompetitorCard";
import { Plus, Loader2, Target } from "lucide-react";

interface CompetitionTabProps {
  competitors: any[];
  loadingCompetitors: boolean;
  competitorDialogOpen: boolean;
  setCompetitorDialogOpen: (open: boolean) => void;
  editingCompetitor: any;
  setEditingCompetitor: (competitor: any) => void;
  onCompetitorSaved: () => void;
  clientId: string;
  onDeleteCompetitor: (id: string, name: string) => void;
}

export function CompetitionTab({
  competitors,
  loadingCompetitors,
  competitorDialogOpen,
  setCompetitorDialogOpen,
  editingCompetitor,
  setEditingCompetitor,
  onCompetitorSaved,
  clientId,
  onDeleteCompetitor,
}: CompetitionTabProps) {
  return (
    <TabsContent value="competition" className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Competitive Intelligence</h3>
          <p className="text-sm text-muted-foreground">
            Track competitors and their strategies to refine your positioning
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCompetitor(null);
            setCompetitorDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Competitor
        </Button>
      </div>

      {loadingCompetitors ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : competitors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {competitors.map((competitor) => (
            <CompetitorCard
              key={competitor.id}
              competitor={competitor}
              onEdit={() => {
                setEditingCompetitor(competitor);
                setCompetitorDialogOpen(true);
              }}
              onDelete={() => onDeleteCompetitor(competitor.id, competitor.name)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Competitors Added Yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Build your competitive intelligence database. Track their strengths, weaknesses, and
              how you differentiate to help the AI craft better positioning.
            </p>
            <Button
              onClick={() => {
                setEditingCompetitor(null);
                setCompetitorDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Competitor
            </Button>
          </CardContent>
        </Card>
      )}

      <CompetitorDialog
        open={competitorDialogOpen}
        onOpenChange={setCompetitorDialogOpen}
        competitor={editingCompetitor}
        clientId={clientId}
        onSuccess={() => {
          onCompetitorSaved();
          setCompetitorDialogOpen(false);
          setEditingCompetitor(null);
        }}
      />
    </TabsContent>
  );
}
