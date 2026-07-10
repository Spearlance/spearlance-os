import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArticleMarkdown } from "@/components/support-docs/ArticleMarkdown";
import { useCategories } from "@/hooks/useCategories";

interface ArticleEditorProps {
  article: any;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function ArticleEditor({ article, open, onClose, onSave }: ArticleEditorProps) {
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    audience: "client",
    category: "getting_started",
    subcategory: "",
    content: "",
    excerpt: "",
    tags: "",
    is_published: false,
    featured_order: "",
  });
  const [saving, setSaving] = useState(false);
  const { byAudience } = useCategories();

  // Internal SOPs draw from the internal groupings; client and shared ("all")
  // docs draw from the client categories.
  const optionAudience = (audience: string) =>
    audience === "internal" ? "internal" : "client";

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || "",
        slug: article.slug || "",
        audience: article.audience || "client",
        category: article.category || "getting_started",
        subcategory: article.subcategory || "",
        content: article.content || "",
        excerpt: article.excerpt || "",
        tags: article.tags?.join(", ") || "",
        is_published: article.is_published || false,
        featured_order: article.featured_order?.toString() || "",
      });
    }
  }, [article]);

  // Category taxonomy is audience-dependent and comes from the DB.
  const categoryOptions = byAudience(optionAudience(formData.audience));

  const handleAudienceChange = (audience: string) => {
    setFormData((prev) => {
      const options = byAudience(optionAudience(audience));
      const slugs = options.map((o) => o.slug);
      const category = slugs.includes(prev.category)
        ? prev.category
        : options[0]?.slug ?? prev.category;
      return { ...prev, audience, category };
    });
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: !article ? generateSlug(title) : prev.slug
    }));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content || !formData.excerpt) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tags = formData.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

      const articleData = {
        title: formData.title,
        slug: formData.slug,
        audience: formData.audience,
        category: formData.category,
        subcategory: formData.subcategory || null,
        content: formData.content,
        excerpt: formData.excerpt,
        tags,
        is_published: formData.is_published,
        featured_order: formData.featured_order ? parseInt(formData.featured_order) : null,
        published_at: formData.is_published && !article?.is_published ? new Date().toISOString() : article?.published_at,
      };

      if (article) {
        const { error } = await supabase
          .from("support_articles")
          .update(articleData)
          .eq("id", article.id);

        if (error) throw error;
        toast.success("Article updated successfully");
      } else {
        const { error } = await supabase
          .from("support_articles")
          .insert({
            ...articleData,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Article created successfully");
      }

      onSave();
    } catch (error: any) {
      toast.error(error.message || "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {article ? "Edit Article" : "Create New Article"}
          </DialogTitle>
          <DialogDescription>
            Write and publish support documentation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="article-url-slug"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audience">Audience *</Label>
              <Select
                value={formData.audience}
                onValueChange={handleAudienceChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client — client-facing help</SelectItem>
                  <SelectItem value="internal">Internal — staff-only SOP</SelectItem>
                  <SelectItem value="all">All — shared with everyone</SelectItem>
                </SelectContent>
              </Select>
              {formData.audience === "internal" && (
                <p className="text-xs text-muted-foreground">
                  Internal SOPs are never shown to clients (enforced by RLS).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                placeholder="Optional subcategory"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt *</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Short summary (150-200 characters)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          {/* Content Editor with Preview */}
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="space-y-2">
              <Label htmlFor="content">Content * (Markdown supported)</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your article content in Markdown..."
                rows={15}
                className="font-mono"
              />
            </TabsContent>
            <TabsContent value="preview" className="border rounded-lg p-4 min-h-[400px]">
              <ArticleMarkdown
                content={formData.content || "*No content yet*"}
                className="prose-sm"
              />
            </TabsContent>
          </Tabs>

          {/* Publishing Options */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                />
                <Label>Publish article</Label>
              </div>
              
              <div className="flex items-center gap-3">
                <Label htmlFor="featured_order" className="w-32">Featured order:</Label>
                <Input
                  id="featured_order"
                  type="number"
                  value={formData.featured_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured_order: e.target.value }))}
                  placeholder="Leave empty to not feature"
                  className="w-32"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Article"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
