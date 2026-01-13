import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Copy, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import PromptTemplateSelector from "./PromptTemplateSelector";

interface PageAIContentTabProps {
  pageId: string;
  buildId: string;
  clientId: string;
  pageType: string;
  pageName: string;
  initialContent: string;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "link",
];

export default function PageAIContentTab({
  pageId,
  buildId,
  clientId,
  pageType,
  pageName,
  initialContent,
}: PageAIContentTabProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [content, setContent] = useState(initialContent);
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset content when page changes
  useEffect(() => {
    setContent(initialContent);
  }, [pageId, initialContent]);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["page-prompt-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_page_prompt_templates")
        .select("*")
        .order("page_type");

      if (error) throw error;
      return data;
    },
  });

  // Set default template based on page type
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const matchingTemplate = templates.find((t) => t.page_type === pageType);
      if (matchingTemplate) {
        setSelectedTemplateId(matchingTemplate.id);
      } else {
        setSelectedTemplateId(templates[0].id);
      }
    }
  }, [templates, pageType, selectedTemplateId]);

  // Generate content
  const generateContent = async () => {
    setIsGenerating(true);
    try {
      const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

      const { data, error } = await supabase.functions.invoke("generate-page-content", {
        body: {
          clientId,
          pageType: selectedTemplate?.page_type || pageType,
          pageName,
          promptTemplate: selectedTemplate?.prompt_template,
          customInstructions,
          outputFormat: "richtext",
        },
      });

      if (error) throw error;

      if (data?.content) {
        setContent(data.content);
        toast.success("Content generated successfully");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save content
  const saveContent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("website_build_pages")
        .update({ ai_content: content })
        .eq("id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
      toast.success("Content saved");
    },
    onError: () => {
      toast.error("Failed to save content");
    },
  });

  // Copy content to clipboard
  const copyContent = () => {
    // Create a temporary element to convert HTML to plain text with structure
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    
    // Try to copy as HTML first
    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([content], { type: "text/html" }),
        "text/plain": new Blob([tempDiv.innerText], { type: "text/plain" }),
      }),
    ]).then(() => {
      toast.success("Content copied to clipboard");
    }).catch(() => {
      // Fallback to plain text
      navigator.clipboard.writeText(tempDiv.innerText);
      toast.success("Content copied as plain text");
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <PromptTemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
        />

        <div className="space-y-2">
          <Label>Custom Instructions (Optional)</Label>
          <Textarea
            placeholder="Add any specific instructions for this page... (e.g., 'Focus on residential services', 'Mention 24/7 availability', 'Target young families')"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          onClick={generateContent}
          disabled={isGenerating}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Content
            </>
          )}
        </Button>
      </div>

      {content && (
        <>
          <div className="border-t pt-4">
            <Label className="mb-2 block">Generated Content</Label>
            <div className="min-h-[300px] border rounded-lg overflow-hidden">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                className="h-[260px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={copyContent} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Content
            </Button>
            <Button onClick={() => saveContent.mutate()} disabled={saveContent.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {saveContent.isPending ? "Saving..." : "Save Content"}
            </Button>
          </div>
        </>
      )}

      {!content && !isGenerating && (
        <div className="text-center py-8 text-muted-foreground border-t">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a template and click Generate to create content</p>
          <p className="text-xs mt-1">Content will be tailored to your client's profile</p>
        </div>
      )}
    </div>
  );
}
