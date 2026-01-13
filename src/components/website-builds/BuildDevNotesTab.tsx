import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface BuildDevNotesTabProps {
  devNotes: string;
  onUpdate: (notes: string) => void;
}

export function BuildDevNotesTab({ devNotes, onUpdate }: BuildDevNotesTabProps) {
  const [notes, setNotes] = useState(devNotes);

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== devNotes) {
        onUpdate(notes);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [notes]);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["code-block"],
      ["link"],
      ["clean"],
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Developer Notes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Technical notes, requirements, and specifications for this build. Auto-saves as you type.
        </p>
      </CardHeader>
      <CardContent>
        <div className="min-h-[400px]">
          <ReactQuill
            theme="snow"
            value={notes}
            onChange={setNotes}
            modules={modules}
            placeholder="Add technical notes, requirements, API integrations, or any development-related documentation..."
            className="h-80"
          />
        </div>
      </CardContent>
    </Card>
  );
}
