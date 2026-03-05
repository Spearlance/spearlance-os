import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Download, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExportData() {
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    return {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      "Content-Type": "application/json",
    };
  };

  const fetchTables = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-csv`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "list" }),
        }
      );
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      setTables(data.tables || []);
    } catch (err) {
      toast.error("Failed to load table list");
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === tables.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tables));
    }
  };

  const toggle = (table: string) => {
    const next = new Set(selected);
    if (next.has(table)) next.delete(table);
    else next.add(table);
    setSelected(next);
  };

  const downloadCsv = async (table: string) => {
    setDownloading(table);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-csv`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ table }),
        }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${table}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to download ${table}`);
    } finally {
      setDownloading(null);
    }
  };

  const downloadZip = async () => {
    const tablesToDownload = selected.size > 0 ? Array.from(selected) : undefined;
    setDownloadingZip(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-csv`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(tablesToDownload ? { tables: tablesToDownload } : { all: true }),
        }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "database-export.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch {
      toast.error("Failed to download ZIP");
    } finally {
      setDownloadingZip(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Export Data</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Download database tables as CSV files
          </p>
        </div>
        <Button onClick={downloadZip} disabled={downloadingZip}>
          {downloadingZip ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {selected.size > 0
            ? `Download ${selected.size} as ZIP`
            : "Download All as ZIP"}
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
          <Checkbox
            checked={selected.size === tables.length && tables.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium text-foreground">
            Select All ({tables.length} tables)
          </span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
          {tables.map((table) => (
            <div
              key={table}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected.has(table)}
                  onCheckedChange={() => toggle(table)}
                />
                <span className="text-sm font-mono text-foreground">{table}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadCsv(table)}
                disabled={downloading === table}
              >
                {downloading === table ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
