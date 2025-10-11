import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";

const clientEditSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(255),
  status: z.enum(['active', 'archived', 'paused']),
  booking_permissions: z.string().optional(),
  website_url: z.string().url("Invalid URL").optional().or(z.literal('')),
  oviond_url: z.string().url("Invalid URL").optional().or(z.literal('')),
  drive_folder_url: z.string().url("Invalid URL").optional().or(z.literal('')),
  canva_folder_url: z.string().url("Invalid URL").optional().or(z.literal('')),
  domain: z.string().optional(),
});

type ClientEditForm = z.infer<typeof clientEditSchema>;

interface EditClientDialogProps {
  client: {
    id: string;
    name: string;
    status: 'active' | 'archived' | 'paused';
    booking_permissions?: string;
    website_url?: string;
    oviond_url?: string;
    drive_folder_url?: string;
    canva_folder_url?: string;
    domain?: string;
  };
  assignedUsers: Array<{ id: string; name: string }>;
  onClientUpdated: () => void;
}

export function EditClientDialog({ client, assignedUsers, onClientUpdated }: EditClientDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ClientEditForm>({
    resolver: zodResolver(clientEditSchema),
    defaultValues: {
      name: client.name || "",
      status: client.status || "active",
      booking_permissions: client.booking_permissions || "self_book",
      website_url: client.website_url || "",
      oviond_url: client.oviond_url || "",
      drive_folder_url: client.drive_folder_url || "",
      canva_folder_url: client.canva_folder_url || "",
      domain: client.domain || "",
    },
  });

  const onSubmit = async (data: ClientEditForm) => {
    setIsLoading(true);
    try {
      const updateData = {
        name: data.name,
        status: data.status,
        booking_permissions: data.booking_permissions || null,
        website_url: data.website_url || null,
        oviond_url: data.oviond_url || null,
        drive_folder_url: data.drive_folder_url || null,
        canva_folder_url: data.canva_folder_url || null,
        domain: data.domain || null,
      };

      const { error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", client.id);

      if (error) throw error;

      toast({
        title: "Client updated successfully",
        description: `${data.name} has been updated.`,
      });

      setOpen(false);
      onClientUpdated();
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Error updating client",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Client Information
          </DialogTitle>
          <DialogDescription>
            Update client details and configuration
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="booking_permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Permissions</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select booking permissions" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="self_book">Self Book</SelectItem>
                      <SelectItem value="request_only">Request Only</SelectItem>
                      <SelectItem value="admin_only">Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Controls how meetings can be scheduled for this client
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="oviond_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oviond URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://app.oviond.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drive_folder_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Drive Folder URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://drive.google.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canva_folder_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canva Folder URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://canva.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Assigned Users (Read-only)</FormLabel>
              <div className="flex flex-wrap gap-2">
                {assignedUsers.length > 0 ? (
                  assignedUsers.map((user) => (
                    <Badge key={user.id} variant="outline">
                      {user.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No users assigned
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                User assignments are managed in the User Management tab
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
