import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Trash2, Edit2, X, Check, AlertCircle, Save } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Database } from "@/integrations/supabase/types";

type TaskColumn = Database["public"]["Tables"]["task_columns"]["Row"];

type PendingColumn = Omit<TaskColumn, 'id' | 'created_at' | 'updated_at'> & { 
  tempId: string;
  id?: string;
};

export function TaskColumnManager() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [originalColumns, setOriginalColumns] = useState<TaskColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editMappedStatus, setEditMappedStatus] = useState<'to_do' | 'in_progress' | 'done'>('in_progress');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#6B7280");
  
  // Batch save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    added: PendingColumn[];
    updated: Map<string, { name: string; color: string }>;
    deleted: string[];
    reordered: boolean;
  }>({
    added: [],
    updated: new Map(),
    deleted: [],
    reordered: false,
  });

  useEffect(() => {
    if (selectedClient) {
      loadColumns();
    }
  }, [selectedClient]);

  const loadColumns = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_columns")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("display_order");

      if (error) throw error;
      setColumns(data || []);
      setOriginalColumns(data || []);
      // Reset pending changes when loading fresh data
      setPendingChanges({
        added: [],
        updated: new Map(),
        deleted: [],
        reordered: false,
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error loading columns:", error);
      toast({
        title: "Error",
        description: "Failed to load task columns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    if (!selectedClient || !newColumnName.trim()) return;

    // Check for duplicate names
    const key = newColumnName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const isDuplicate = columns.some(c => c.key === key) || 
                        pendingChanges.added.some(c => c.key === key);
    
    if (isDuplicate) {
      toast({
        title: "Error",
        description: "A column with this name already exists",
        variant: "destructive",
      });
      return;
    }

    // Find the "Done" column to insert before it
    const doneColumn = columns.find(c => c.key === 'done');
    let newOrder: number;
    let updatedColumns = [...columns];

    if (doneColumn) {
      // Insert before "Done"
      newOrder = doneColumn.display_order;
      
      // Shift all columns from this position onwards by 1
      updatedColumns = updatedColumns.map(col => 
        col.display_order >= newOrder 
          ? { ...col, display_order: col.display_order + 1 }
          : col
      );
    } else {
      // No "Done" column, add at the end
      const maxOrder = Math.max(...columns.map(c => c.display_order), -1);
      newOrder = maxOrder + 1;
    }

    const tempId = `temp-${Date.now()}`;

    // Auto-select mapped status based on column name
    const inferredMappedStatus = key === 'done' || newColumnName.toLowerCase().includes('done') || newColumnName.toLowerCase().includes('complete')
      ? 'done'
      : key === 'to_do' || newColumnName.toLowerCase().includes('todo') || newColumnName.toLowerCase().includes('backlog')
      ? 'to_do'
      : 'in_progress';

    const newColumn: PendingColumn = {
      tempId,
      client_id: selectedClient.id,
      name: newColumnName.trim(),
      key,
      color: newColumnColor,
      display_order: newOrder,
      is_default: false,
      mapped_status: inferredMappedStatus,
    };

    setPendingChanges(prev => ({
      ...prev,
      added: [...prev.added, newColumn],
    }));

    // Add to columns for immediate display
    const newColumnWithId = {
      ...newColumn,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as TaskColumn;

    // Add the new column to updatedColumns and sort by display_order
    const finalColumns = [...updatedColumns, newColumnWithId].sort(
      (a, b) => a.display_order - b.display_order
    );

    setColumns(finalColumns);

    setHasUnsavedChanges(true);
    setNewColumnName("");
    setNewColumnColor("#6B7280");
    setShowAddNew(false);
  };

  const handleStartEdit = (column: TaskColumn) => {
    setEditingId(column.id);
    setEditName(column.name);
    setEditColor(column.color || "#6B7280");
    setEditMappedStatus(column.mapped_status);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    setIsSavingEdit(true);
    try {
      // Save directly to database
      const { error } = await supabase
        .from("task_columns")
        .update({ 
          name: editName.trim(), 
          color: editColor,
          mapped_status: editMappedStatus
        })
        .eq("id", editingId);

      if (error) throw error;

      // Update local columns display
      setColumns(prev => prev.map(col => 
        col.id === editingId 
          ? { ...col, name: editName.trim(), color: editColor, mapped_status: editMappedStatus }
          : col
      ));

      // Update original columns to reflect saved state
      setOriginalColumns(prev => prev.map(col => 
        col.id === editingId 
          ? { ...col, name: editName.trim(), color: editColor, mapped_status: editMappedStatus }
          : col
      ));

      toast({
        title: "Column updated",
        description: "Changes saved successfully",
      });

      setEditingId(null);
      
      // Trigger update event for Tasks.tsx
      window.dispatchEvent(new CustomEvent('taskColumnsUpdated'));
    } catch (error: any) {
      console.error("Error updating column:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update column",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (column: TaskColumn) => {
    if (column.is_default) {
      toast({
        title: "Cannot Delete",
        description: "Default columns cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    // Check if any tasks use this column
    const { count } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", column.key as any);

    if (count && count > 0) {
      const confirmed = window.confirm(
        `${count} task${count === 1 ? '' : 's'} use this column. Deleting it will move them to "To Do". Continue?`
      );
      if (!confirmed) return;
    }

    setPendingChanges(prev => ({
      ...prev,
      deleted: [...prev.deleted, column.id],
    }));

    // Remove from display
    setColumns(prev => prev.filter(c => c.id !== column.id));
    setHasUnsavedChanges(true);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Check if "Done" column was moved
    const doneIndex = items.findIndex(col => col.key === 'done');
    
    if (doneIndex !== -1 && doneIndex !== items.length - 1) {
      // Move "Done" back to the end
      const [doneColumn] = items.splice(doneIndex, 1);
      items.push(doneColumn);
      
      toast({
        title: "Note",
        description: "'Done' column must remain at the end",
      });
    }

    // Update display_order for all items
    const reorderedItems = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setColumns(reorderedItems);
    setPendingChanges(prev => ({ ...prev, reordered: true }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!selectedClient) return;

    setIsSaving(true);
    try {
      // 1. Delete columns
      for (const columnId of pendingChanges.deleted) {
        // Check if it's not a temp column
        if (!columnId.startsWith('temp-')) {
          // Move tasks to first default column
          const originalColumn = originalColumns.find(c => c.id === columnId);
          if (originalColumn) {
            const { data: toDoColumn } = await supabase
              .from("task_columns")
              .select("key")
              .eq("client_id", selectedClient.id)
              .eq("is_default", true)
              .order("display_order")
              .limit(1)
              .single();

            if (toDoColumn) {
              await supabase
                .from("tasks")
                .update({ status: toDoColumn.key as any })
                .eq("status", originalColumn.key as any);
            }
          }

          const { error } = await supabase
            .from("task_columns")
            .delete()
            .eq("id", columnId);

          if (error) throw error;
        }
      }

      // 2. Add new columns with temporary high display_order to avoid conflicts
      for (const newColumn of pendingChanges.added) {
        const { error } = await supabase
          .from("task_columns")
          .insert({
            client_id: newColumn.client_id,
            name: newColumn.name,
            key: newColumn.key,
            color: newColumn.color,
            display_order: 9999, // Temporary high value to avoid conflicts
            is_default: newColumn.is_default,
          });

        if (error) throw error;
      }

      // Reload columns from database to get the newly inserted columns with real IDs
      let columnsToReorder = columns;
      if (pendingChanges.added.length > 0) {
        const { data: freshColumns, error: reloadError } = await supabase
          .from("task_columns")
          .select("*")
          .eq("client_id", selectedClient.id)
          .order("display_order");

        if (reloadError) throw reloadError;
        
        // Map fresh columns with their intended display_order from UI state
        columnsToReorder = freshColumns!.map((col) => {
          // Find the column in our UI state to get its intended display_order
          const uiColumn = columns.find(c => 
            c.id === col.id || 
            (c.id.startsWith('temp-') && c.key === col.key)
          );
          return {
            ...col,
            display_order: uiColumn?.display_order ?? col.display_order
          };
        });
      }

      // 3. Update display order if reordered OR if new columns were added (two-phase update to avoid UNIQUE constraint conflicts)
      if (pendingChanges.reordered || pendingChanges.added.length > 0) {
        // Phase 1: Move all columns to large negative positions to guarantee no conflicts
        for (let i = 0; i < columnsToReorder.length; i++) {
          const column = columnsToReorder[i];
          if (!column.id.startsWith('temp-')) {
            const tempOrder = -10000 - i; // Large negative offset to avoid any conflicts
            const { error } = await supabase
              .from("task_columns")
              .update({ display_order: tempOrder })
              .eq("id", column.id);

            if (error) {
              console.error("Error in phase 1 reorder:", error);
              throw error;
            }
          }
        }

        // Phase 2: Update to final positions
        for (const column of columnsToReorder) {
          if (!column.id.startsWith('temp-')) {
            const { error } = await supabase
              .from("task_columns")
              .update({ display_order: column.display_order })
              .eq("id", column.id);

            if (error) {
              console.error("Error in phase 2 reorder:", error);
              throw error;
            }
          }
        }
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });

      // Reload fresh data
      await loadColumns();
      
      // Trigger update event for Tasks.tsx
      window.dispatchEvent(new CustomEvent('taskColumnsUpdated'));
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    const confirmed = window.confirm("Discard all unsaved changes?");
    if (!confirmed) return;

    // Only discard add/delete/reorder changes (edits are saved immediately)
    setColumns(originalColumns);
    setPendingChanges({
      added: [],
      updated: new Map(),
      deleted: [],
      reordered: false,
    });
    setHasUnsavedChanges(false);
    setEditingId(null);
    setShowAddNew(false);
  };

  const getColumnBadge = (column: TaskColumn) => {
    if (column.id.startsWith('temp-')) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">Unsaved</Badge>;
    }
    // Remove "Modified" badge since edits are saved immediately
    if (column.is_default) {
      return <Badge variant="secondary">Default</Badge>;
    }
    return null;
  };

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please select a client</p>
      </div>
    );
  }

  const colorOptions = [
    { value: "#3B82F6", label: "Blue" },
    { value: "#8B5CF6", label: "Purple" },
    { value: "#10B981", label: "Green" },
    { value: "#F59E0B", label: "Orange" },
    { value: "#EF4444", label: "Red" },
    { value: "#6B7280", label: "Gray" },
    { value: "#EC4899", label: "Pink" },
    { value: "#14B8A6", label: "Teal" },
  ];

  // Only show unsaved changes for add/delete/reorder (not edits)
  const hasRealUnsavedChanges = 
    pendingChanges.added.length > 0 || 
    pendingChanges.deleted.length > 0 || 
    pendingChanges.reordered;

  return (
    <div className="space-y-6">
      {hasRealUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes (added/deleted/reordered columns). Click "Save Settings" to persist your changes.
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Task Board Columns</CardTitle>
          <CardDescription>
            Customize the columns (statuses) that appear in your Kanban board. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="columns">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {columns.map((column, index) => (
                <Draggable 
                  key={column.id} 
                  draggableId={column.id} 
                  index={index}
                  isDragDisabled={column.key === 'done'}
                >
                  {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors ${
                                column.key === 'done' ? 'opacity-75 cursor-not-allowed' : ''
                              }`}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>

                              {editingId === column.id ? (
                                <>
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1"
                                    placeholder="Column name"
                                  />
                                  <select
                                    value={editColor}
                                    onChange={(e) => setEditColor(e.target.value)}
                                    className="px-3 py-2 border rounded-md bg-background"
                                  >
                                    {colorOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={editMappedStatus}
                                    onChange={(e) => setEditMappedStatus(e.target.value as 'to_do' | 'in_progress' | 'done')}
                                    className="px-3 py-2 border rounded-md bg-background"
                                    title="Database status this column maps to"
                                  >
                                    <option value="to_do">To Do</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="done">Done</option>
                                  </select>
                                   <Button 
                                     size="sm" 
                                     onClick={handleSaveEdit}
                                     disabled={isSavingEdit}
                                   >
                                     <Check className="h-4 w-4" />
                                   </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: column.color || "#6B7280" }}
                                  />
                                  <span className="flex-1 font-medium">{column.name}</span>
                                  {getColumnBadge(column)}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStartEdit(column)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  {!column.is_default && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDelete(column)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {showAddNew ? (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-accent/50">
                  <Input
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") setShowAddNew(false);
                    }}
                    autoFocus
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <select
                      value={newColumnColor}
                      onChange={(e) => setNewColumnColor(e.target.value)}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      {colorOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleAddColumn}>Add</Button>
                  <Button variant="ghost" onClick={() => setShowAddNew(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowAddNew(true)} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              )}

              {hasRealUnsavedChanges && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleSaveSettings} 
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleDiscardChanges} 
                    variant="outline"
                    disabled={isSaving}
                  >
                    Discard Changes
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
