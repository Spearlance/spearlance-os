import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Copy, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface BuildAIContentTabProps {
  buildId: string;
  clientId: string;
}

interface GeneratedContent {
  headline: string;
  subheadlines: string[];
  body_sections: { title: string; content: string }[];
  cta_primary: string;
  cta_secondary: string;
  meta_title: string;
  meta_description: string;
}

export function BuildAIContentTab({ buildId, clientId }: BuildAIContentTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ["website-build-pages", buildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_build_pages")
        .select("*")
        .eq("build_id", buildId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const selectedPage = pages?.find((p) => p.id === selectedPageId);
  const generatedContent = selectedPage?.ai_generated_content as unknown as GeneratedContent | null;

  const generateContent = useMutation({
    mutationFn: async () => {
      if (!selectedPage) throw new Error("No page selected");

      const { data, error } = await supabase.functions.invoke("generate-page-content", {
        body: {
          buildId,
          pageId: selectedPage.id,
          pageName: selectedPage.page_name,
          pageType: selectedPage.page_type,
          contentNotes: selectedPage.content_notes,
          clientId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
      toast({ title: "Content generated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error generating content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (pagesLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Generator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate page content using the client's brand voice, avatars, and marketing profile.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedPageId} onValueChange={setSelectedPageId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a page..." />
              </SelectTrigger>
              <SelectContent>
                {pages?.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.page_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => generateContent.mutate()}
              disabled={!selectedPageId || generateContent.isPending}
            >
              {generateContent.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </div>

          {selectedPage?.content_notes && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Content Notes</p>
              <p className="text-sm text-muted-foreground">{selectedPage.content_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {generatedContent && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Headline</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(generatedContent.headline, "headline")}
                >
                  {copiedField === "headline" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{generatedContent.headline}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Call to Actions</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      `${generatedContent.cta_primary}\n${generatedContent.cta_secondary}`,
                      "ctas"
                    )
                  }
                >
                  {copiedField === "ctas" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <span className="text-sm text-muted-foreground">Primary:</span>{" "}
                <strong>{generatedContent.cta_primary}</strong>
              </p>
              <p>
                <span className="text-sm text-muted-foreground">Secondary:</span>{" "}
                {generatedContent.cta_secondary}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Subheadlines</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(generatedContent.subheadlines.join("\n"), "subheadlines")
                  }
                >
                  {copiedField === "subheadlines" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {generatedContent.subheadlines.map((sub, i) => (
                  <li key={i}>{sub}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {generatedContent.body_sections?.map((section, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(section.content, `section-${i}`)}
                  >
                    {copiedField === `section-${i}` ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{section.content}</p>
              </CardContent>
            </Card>
          ))}

          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">SEO Meta Tags</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      `Title: ${generatedContent.meta_title}\nDescription: ${generatedContent.meta_description}`,
                      "meta"
                    )
                  }
                >
                  {copiedField === "meta" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Title ({generatedContent.meta_title?.length || 0}/60):</span>
                <p className="font-medium">{generatedContent.meta_title}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  Description ({generatedContent.meta_description?.length || 0}/160):
                </span>
                <p>{generatedContent.meta_description}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!generatedContent && selectedPageId && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            No content generated yet for this page
          </p>
          <Button onClick={() => generateContent.mutate()} disabled={generateContent.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Content
          </Button>
        </div>
      )}
    </div>
  );
}
