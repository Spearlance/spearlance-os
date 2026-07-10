import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useCategories,
  useCategoryMutations,
  type SupportCategoryRow,
} from "@/hooks/useCategories";
import {
  ICON_OPTIONS,
  COLOR_OPTIONS,
  resolveIcon,
  DEFAULT_ICON_NAME,
  DEFAULT_COLOR,
} from "@/components/support-docs/categoryIcons";
import { CategoryCard } from "@/components/support-docs/CategoryCard";
import { resolveCategory } from "@/components/support-docs/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Lock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AUDIENCE_GROUPS: { audience: string; label: string; icon: typeof Lock }[] = [
  { audience: "internal", label: "Internal SOP categories", icon: Lock },
  { audience: "client", label: "Client help categories", icon: Users },
  { audience: "all", label: "Shared categories", icon: Users },
];

type EditorState = {
  id: string | null;
  slug: string;
  audience: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};

const emptyEditor = (audience: string): EditorState => ({
  id: null,
  slug: "",
  audience,
  name: "",
  description: "",
  icon: DEFAULT_ICON_NAME,
  color: DEFAULT_COLOR,
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function CategoryManager() {
  const { rows } = useCategories({ includeInactive: true });
  const { create, update, remove } = useCategoryMutations();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteRow, setDeleteRow] = useState<SupportCategoryRow | null>(null);

  // Article counts per category slug — drives the delete guard and the UI count.
  const { data: counts = {} } = useQuery({
    queryKey: ["support-article-category-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("support_articles")
        .select("category");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((a: { category: string }) => {
        map[a.category] = (map[a.category] || 0) + 1;
      });
      return map;
    },
    staleTime: 60 * 1000,
  });

  const openCreate = (audience: string) => setEditor(emptyEditor(audience));
  const openEdit = (row: SupportCategoryRow) =>
    setEditor({
      id: row.id,
      slug: row.slug,
      audience: row.audience,
      name: row.name,
      description: row.description ?? "",
      icon: row.icon ?? DEFAULT_ICON_NAME,
      color: row.color ?? DEFAULT_COLOR,
    });

  const handleSave = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    const slug = editor.slug.trim();
    if (!name || !slug) {
      toast.error("Name and slug are required");
      return;
    }

    try {
      if (editor.id) {
        // Slug and audience are immutable after create (articles store the slug).
        await update.mutateAsync({
          id: editor.id,
          patch: {
            name,
            description: editor.description,
            icon: editor.icon,
            color: editor.color,
          },
        });
        toast.success("Category updated");
      } else {
        const siblings = rows.filter((r) => r.audience === editor.audience);
        const nextOrder =
          siblings.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;
        await create.mutateAsync({
          slug,
          audience: editor.audience,
          name,
          description: editor.description,
          icon: editor.icon,
          color: editor.color,
          sort_order: nextOrder,
        });
        toast.success("Category created");
      }
      setEditor(null);
    } catch (err: any) {
      toast.error(
        err?.message?.includes("duplicate")
          ? "A category with that slug already exists for this audience"
          : err?.message || "Failed to save category",
      );
    }
  };

  const moveCategory = (
    row: SupportCategoryRow,
    dir: "up" | "down",
    group: SupportCategoryRow[],
  ) => {
    const idx = group.findIndex((r) => r.id === row.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= group.length) return;
    const other = group[swapIdx];
    update.mutate({ id: row.id, patch: { sort_order: other.sort_order } });
    update.mutate({ id: other.id, patch: { sort_order: row.sort_order } });
  };

  const toggleActive = (row: SupportCategoryRow) => {
    update.mutate(
      { id: row.id, patch: { is_active: !row.is_active } },
      {
        onSuccess: () =>
          toast.success(row.is_active ? "Category deactivated" : "Category activated"),
      },
    );
  };

  const requestDelete = (row: SupportCategoryRow) => {
    const count = counts[row.slug] || 0;
    if (count > 0) {
      toast.error(
        `Move or delete this category's ${count} article${count === 1 ? "" : "s"} first, or deactivate it instead.`,
      );
      return;
    }
    setDeleteRow(row);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      await remove.mutateAsync(deleteRow.id);
      toast.success("Category deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete category");
    } finally {
      setDeleteRow(null);
    }
  };

  return (
    <div className="space-y-8">
      {AUDIENCE_GROUPS.map((group) => {
        const groupRows = rows
          .filter((r) => r.audience === group.audience)
          .sort((a, b) => a.sort_order - b.sort_order);
        // Hide the "Shared" group entirely when there are no shared categories.
        if (group.audience === "all" && groupRows.length === 0) return null;
        const GroupIcon = group.icon;

        return (
          <Card key={group.audience}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GroupIcon className="h-4 w-4" />
                {group.label}
                <span className="text-sm font-normal text-muted-foreground">
                  ({groupRows.length})
                </span>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => openCreate(group.audience)}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No categories yet.
                </p>
              ) : (
                groupRows.map((row, idx) => {
                  const Icon = resolveIcon(row.icon);
                  const count = counts[row.slug] || 0;
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3",
                        !row.is_active && "opacity-60",
                      )}
                    >
                      <div className={cn("p-2 rounded-md bg-gradient-to-br", row.color)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{row.name}</span>
                          {!row.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">{row.slug}</code>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {count} article{count === 1 ? "" : "s"}
                      </Badge>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={idx === 0}
                          onClick={() => moveCategory(row, "up", groupRows)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={idx === groupRows.length - 1}
                          onClick={() => moveCategory(row, "down", groupRows)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title={row.is_active ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(row)}
                        >
                          {row.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(row)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => requestDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Editor dialog */}
      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              Categories group support articles and SOPs. The slug is part of the URL
              and is fixed once created.
            </DialogDescription>
          </DialogHeader>

          {editor && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Name *</Label>
                  <Input
                    id="cat-name"
                    value={editor.name}
                    onChange={(e) =>
                      setEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: e.target.value,
                              // Auto-fill slug from name only when creating.
                              slug: prev.id ? prev.slug : slugify(e.target.value),
                            }
                          : prev,
                      )
                    }
                    placeholder="SEO Delivery"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-slug">Slug *</Label>
                  <Input
                    id="cat-slug"
                    value={editor.slug}
                    disabled={!!editor.id}
                    onChange={(e) =>
                      setEditor((prev) =>
                        prev ? { ...prev, slug: slugify(e.target.value) } : prev,
                      )
                    }
                    placeholder="seo_delivery"
                  />
                  {editor.id && (
                    <p className="text-xs text-muted-foreground">
                      Slug can't change — articles reference it.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={editor.audience}
                  disabled={!!editor.id}
                  onValueChange={(value) =>
                    setEditor((prev) => (prev ? { ...prev, audience: value } : prev))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal — staff SOPs</SelectItem>
                    <SelectItem value="client">Client — help center</SelectItem>
                    <SelectItem value="all">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={editor.description}
                  onChange={(e) =>
                    setEditor((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev,
                    )
                  }
                  placeholder="Short summary shown on the category card"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-8 gap-2">
                  {ICON_OPTIONS.map((name) => {
                    const OptIcon = resolveIcon(name);
                    const selected = editor.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() =>
                          setEditor((prev) => (prev ? { ...prev, icon: name } : prev))
                        }
                        className={cn(
                          "flex items-center justify-center rounded-md border p-2 transition-colors hover:bg-muted",
                          selected && "border-primary ring-2 ring-primary/40",
                        )}
                      >
                        <OptIcon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-8 gap-2">
                  {COLOR_OPTIONS.map((opt) => {
                    const selected = editor.color === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.label}
                        onClick={() =>
                          setEditor((prev) =>
                            prev ? { ...prev, color: opt.value } : prev,
                          )
                        }
                        className={cn(
                          "h-8 rounded-md bg-gradient-to-br transition-transform hover:scale-105",
                          opt.value,
                          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Live preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="max-w-xs pointer-events-none">
                  <CategoryCard
                    category={{
                      id: editor.slug || "preview",
                      name: editor.name || "Category name",
                      description: editor.description || "Category description",
                      icon: resolveIcon(editor.icon),
                      color: editor.color,
                    }}
                    articleCount={editor.slug ? counts[editor.slug] || 0 : 0}
                    onClick={() => {}}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setEditor(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={create.isPending || update.isPending}
                >
                  {editor.id ? "Save changes" : "Create category"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete “{deleteRow?.name}”? This can't be undone. (It has no articles.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
