import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface PageNotesTabProps {
  pageId: string;
  buildId: string;
  initialNotes: string;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
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
  "strike",
  "list",
  "bullet",
  "link",
];

export default function PageNotesTab({ pageId, buildId, initialNotes }: PageNotesTabProps) {
  const queryClient = useQueryClient();
  const { setSaveStatus } = useSaveStatus();
  const [notes, setNotes] = useState(initialNotes);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset notes when page changes
  useEffect(() => {
    setNotes(initialNotes);
    setHasChanges(false);
  }, [pageId, initialNotes]);

  const saveNotes = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("website_build_pages")
        .update({ dev_notes: content })
        .eq("id", pageId);

      if (error) throw error;
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-build-pages", buildId] });
      setSaveStatus("saved");
      setHasChanges(false);
    },
    onError: () => {
      setSaveStatus("error");
      toast.error("Failed to save notes");
    },
  });

  // Debounced auto-save
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveNotes.mutate(notes);
    }, 1500);

    return () => clearTimeout(timer);
  }, [notes, hasChanges]);

  const handleChange = useCallback((value: string) => {
    setNotes(value);
    setHasChanges(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Add technical notes, design requirements, or developer instructions for this page.
      </div>
      
      <div className="min-h-[300px] border rounded-lg overflow-hidden">
        <ReactQuill
          theme="snow"
          value={notes}
          onChange={handleChange}
          modules={quillModules}
          formats={quillFormats}
          placeholder="Add notes for this page... (e.g., 'Add parallax scrolling effect', 'Client wants video background', 'Needs custom form validation')"
          className="h-[260px]"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Changes are saved automatically
      </p>
    </div>
  );
}
