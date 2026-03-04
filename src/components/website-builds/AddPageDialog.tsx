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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AddPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildId: string;
  onSuccess: () => void;
}

const pageTypes = [
  { value: "landing", label: "Landing Page" },
  { value: "content", label: "Content Page" },
  { value: "form", label: "Form Page" },
  { value: "gallery", label: "Gallery" },
  { value: "blog", label: "Blog" },
  { value: "contact", label: "Contact" },
];

const commonPages = [
  "Home",
  "About",
  "Services",
  "Contact",
  "Portfolio",
  "Blog",
  "FAQ",
  "Team",
  "Testimonials",
  "Pricing",
];

export function AddPageDialog({
  open,
  onOpenChange,
  buildId,
  onSuccess,
}: AddPageDialogProps) {
  const [pageName, setPageName] = useState("");
  const [pageType, setPageType] = useState("content");

  const addPage = useMutation({
    mutationFn: async () => {
      // Get current max sort_order
      const { data: existingPages } = await supabase
        .from("website_build_pages")
        .select("sort_order")
        .eq("build_id", buildId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = (existingPages?.[0]?.sort_order ?? -1) + 1;

      const { error } = await supabase.from("website_build_pages").insert({
        build_id: buildId,
        page_name: pageName,
        page_type: pageType,
        sort_order: nextSortOrder,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page added");
      setPageName("");
      setPageType("content");
      onSuccess();
    },
    onError: (error) => {
      toast.error("Error adding page", { description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Page</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="page_name">Page Name *</Label>
            <Input
              id="page_name"
              placeholder="e.g., Home, About, Services"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
            />
            <div className="flex flex-wrap gap-1 pt-2">
              {commonPages.map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setPageName(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page_type">Page Type</Label>
            <Select value={pageType} onValueChange={setPageType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addPage.mutate()}
            disabled={!pageName || addPage.isPending}
          >
            {addPage.isPending ? "Adding..." : "Add Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
