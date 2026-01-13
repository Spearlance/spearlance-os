import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CreateBuildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: () => void;
}

export function CreateBuildDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: CreateBuildDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    scope_summary: "",
    target_launch_date: "",
  });

  const createBuild = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("website_builds").insert({
        client_id: clientId,
        name: formData.name,
        scope_summary: formData.scope_summary || null,
        target_launch_date: formData.target_launch_date || null,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Build created successfully" });
      setFormData({ name: "", scope_summary: "", target_launch_date: "" });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error creating build",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Website Build</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Main Website Redesign"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Scope Summary</Label>
            <Textarea
              id="scope"
              placeholder="Brief description of the project scope..."
              value={formData.scope_summary}
              onChange={(e) => setFormData({ ...formData, scope_summary: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Target Launch Date</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_launch_date}
              onChange={(e) => setFormData({ ...formData, target_launch_date: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createBuild.mutate()}
            disabled={!formData.name || createBuild.isPending}
          >
            {createBuild.isPending ? "Creating..." : "Create Build"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
