import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Trash2, Edit2, X, Check } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Database } from "@/integrations/supabase/types";

type TaskColumn = Database["public"]["Tables"]["task_columns"]["Row"];

export function TaskColumnManager() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#6B7280");

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

  const handleAddColumn = async () => {
    if (!selectedClient || !newColumnName.trim()) return;

    try {
      // Generate a unique key from the name
      const key = newColumnName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const maxOrder = Math.max(...columns.map(c => c.display_order), -1);

      const { error } = await supabase
        .from("task_columns")
        .insert({
          client_id: selectedClient.id,
          name: newColumnName.trim(),
          key,
          color: newColumnColor,
          display_order: maxOrder + 1,
          is_default: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Column added successfully",
      });

      setNewColumnName("");
      setNewColumnColor("#6B7280");
      setShowAddNew(false);
      loadColumns();
    } catch (error: any) {
      console.error("Error adding column:", error);
      toast({
        title: "Error",
        description: error.message?.includes("duplicate") 
          ? "A column with this name already exists"
          : "Failed to add column",
        variant: "destructive",
      });
    }
  };

  const handleStartEdit = (column: TaskColumn) => {
    setEditingId(column.id);
    setEditName(column.name);
    setEditColor(column.color || "#6B7280");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from("task_columns")
        .update({
          name: editName.trim(),
          color: editColor,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Column updated successfully",
      });

      setEditingId(null);
      loadColumns();
    } catch (error) {
      console.error("Error updating column:", error);
      toast({
        title: "Error",
        description: "Failed to update column",
        variant: "destructive",
      });
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

      // Move tasks to to_do before deleting
      const { data: toDoColumn } = await supabase
        .from("task_columns")
        .select("key")
        .eq("client_id", selectedClient?.id)
        .eq("is_default", true)
        .order("display_order")
        .limit(1)
        .single();

      if (toDoColumn) {
        await supabase
          .from("tasks")
          .update({ status: toDoColumn.key as any })
          .eq("status", column.key as any);
      }
    }

    try {
      const { error } = await supabase
        .from("task_columns")
        .delete()
        .eq("id", column.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Column deleted successfully",
      });

      loadColumns();
    } catch (error) {
      console.error("Error deleting column:", error);
      toast({
        title: "Error",
        description: "Failed to delete column",
        variant: "destructive",
      });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all items
    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index,
    }));

    setColumns(items);

    try {
      for (const update of updates) {
        await supabase
          .from("task_columns")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    } catch (error) {
      console.error("Error reordering columns:", error);
      toast({
        title: "Error",
        description: "Failed to reorder columns",
        variant: "destructive",
      });
      loadColumns();
    }
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

  return (
    <div className="space-y-6">
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
                        <Draggable key={column.id} draggableId={column.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
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
                                  <Button size="sm" onClick={handleSaveEdit}>
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
                                  {column.is_default && (
                                    <Badge variant="secondary">Default</Badge>
                                  )}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
