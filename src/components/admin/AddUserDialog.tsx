import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddUserDialogProps {
  clients: any[];
  onUserCreated: () => void;
}

export function AddUserDialog({ clients, onUserCreated }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "client" as "admin" | "fmm" | "client",
  });
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          client_ids: selectedClientIds,
        },
      });

      if (error) throw error;

      toast({
        title: "User created successfully",
        description: `Invitation email sent to ${formData.email}`,
      });

      setFormData({ email: "", name: "", role: "client" });
      setSelectedClientIds([]);
      setOpen(false);
      onUserCreated();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Failed to create user",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: "admin" | "fmm" | "client") => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="fmm">FMM</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assign Clients (Optional)</Label>
            <div className="text-xs text-muted-foreground mb-2">
              {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} selected
            </div>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={client.id}
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <Label
                      htmlFor={client.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {client.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          {formData.role === "client" && selectedClientIds.length === 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              Note: Client users typically should be assigned to at least one client.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
