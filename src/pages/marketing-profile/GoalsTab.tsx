import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { Edit, Plus, Loader2 } from "lucide-react";
import { DiscoveryData } from "@/lib/launchpadTypes";

interface CurrentStateForm {
  working: string;
  not_working: string;
  constraints: string;
}

interface GoalsTabProps {
  discoveryData: DiscoveryData;
  quarterlyGoals: any[];
  goalsLoading: boolean;
  filterQuarter: string;
  setFilterQuarter: (value: string) => void;
  filterYear: string;
  setFilterYear: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  editingGoal: any;
  setEditingGoal: (goal: any) => void;
  savingGoalId: string | null;
  handleGoalFieldChange: (goalId: string, field: string, value: any) => void;
  handleSaveGoal: (goalId: string) => void;
  handleDeleteGoal: (goalId: string) => void;
  handleAddGoalClick: () => void;
  currentStateForm: CurrentStateForm;
  setCurrentStateForm: (form: CurrentStateForm) => void;
  editingCurrentState: boolean;
  setEditingCurrentState: (editing: boolean) => void;
  savingCurrentState: boolean;
  handleSaveCurrentState: () => void;
  handleCancelCurrentStateEdit: () => void;
  addGoalDialogOpen: boolean;
  setAddGoalDialogOpen: (open: boolean) => void;
  submissionId: string;
  onGoalAdded: () => void;
  clientId: string;
}

export function GoalsTab({
  discoveryData,
  quarterlyGoals,
  goalsLoading,
  filterQuarter,
  setFilterQuarter,
  filterYear,
  setFilterYear,
  filterStatus,
  setFilterStatus,
  editingGoal,
  setEditingGoal,
  savingGoalId,
  handleGoalFieldChange,
  handleSaveGoal,
  handleDeleteGoal,
  currentStateForm,
  setCurrentStateForm,
  editingCurrentState,
  setEditingCurrentState,
  savingCurrentState,
  handleSaveCurrentState,
  handleCancelCurrentStateEdit,
  addGoalDialogOpen,
  setAddGoalDialogOpen,
  onGoalAdded,
  clientId,
}: GoalsTabProps) {
  const availableYears = useMemo(() => {
    const years = [...new Set(quarterlyGoals.map((g) => g.year))];
    return years.sort((a, b) => b - a);
  }, [quarterlyGoals]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear + i);
  }, []);

  const filteredGoals = useMemo(() => {
    return quarterlyGoals
      .filter((goal) => {
        if (filterQuarter !== "all" && goal.quarter !== parseInt(filterQuarter)) return false;
        if (filterYear !== "all" && goal.year !== parseInt(filterYear)) return false;
        if (filterStatus !== "all" && goal.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.quarter - a.quarter;
      });
  }, [quarterlyGoals, filterQuarter, filterYear, filterStatus]);

  return (
    <TabsContent value="goals" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quarterly Goals</CardTitle>
              <CardDescription>Track and manage goals across all quarters</CardDescription>
            </div>
            <Button onClick={() => setAddGoalDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goalsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Filter/Sort Controls */}
              <div className="flex gap-3 items-center flex-wrap">
                <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Quarters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="achieved">Achieved</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="carried_over">Carried Over</SelectItem>
                  </SelectContent>
                </Select>

                <div className="ml-auto text-sm text-muted-foreground">
                  {filteredGoals.length} {filteredGoals.length === 1 ? "goal" : "goals"}
                </div>
              </div>

              <Separator />

              {/* Goals List */}
              <div className="space-y-2">
                {filteredGoals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No goals found. Click "Add Goal" to get started.</p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredGoals.map((goal) => (
                      <AccordionItem key={goal.id} value={goal.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <Badge variant="outline" className="shrink-0">
                              Q{goal.quarter} {goal.year}
                            </Badge>
                            <span className="font-medium flex-1">{goal.goal_text}</span>
                            <Badge
                              variant={
                                goal.status === "achieved"
                                  ? "default"
                                  : goal.status === "failed"
                                  ? "destructive"
                                  : goal.status === "carried_over"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={goal.status === "achieved" ? "bg-green-500 hover:bg-green-600" : ""}
                            >
                              {goal.status === "in_progress"
                                ? "In Progress"
                                : goal.status === "achieved"
                                ? "Achieved"
                                : goal.status === "failed"
                                ? "Failed"
                                : "Carried Over"}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4 space-y-4">
                            {/* Inline Edit Form */}
                            <div className="grid gap-4">
                              <div>
                                <Label>Goal</Label>
                                <Textarea
                                  value={editingGoal?.id === goal.id ? editingGoal.goal_text : goal.goal_text}
                                  onChange={(e) => handleGoalFieldChange(goal.id, "goal_text", e.target.value)}
                                  rows={3}
                                  className="mt-1"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Quarter</Label>
                                  <Select
                                    value={
                                      editingGoal?.id === goal.id
                                        ? editingGoal.quarter.toString()
                                        : goal.quarter.toString()
                                    }
                                    onValueChange={(val) =>
                                      handleGoalFieldChange(goal.id, "quarter", parseInt(val))
                                    }
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">Q1</SelectItem>
                                      <SelectItem value="2">Q2</SelectItem>
                                      <SelectItem value="3">Q3</SelectItem>
                                      <SelectItem value="4">Q4</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>Year</Label>
                                  <Select
                                    value={
                                      editingGoal?.id === goal.id
                                        ? editingGoal.year.toString()
                                        : goal.year.toString()
                                    }
                                    onValueChange={(val) =>
                                      handleGoalFieldChange(goal.id, "year", parseInt(val))
                                    }
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {yearOptions.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                          {year}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <Label>Status</Label>
                                <Select
                                  value={editingGoal?.id === goal.id ? editingGoal.status : goal.status}
                                  onValueChange={(val) => handleGoalFieldChange(goal.id, "status", val)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="achieved">Achieved</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="carried_over">Carried Over</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Notes</Label>
                                <Textarea
                                  value={
                                    editingGoal?.id === goal.id
                                      ? editingGoal.notes || ""
                                      : goal.notes || ""
                                  }
                                  onChange={(e) => handleGoalFieldChange(goal.id, "notes", e.target.value)}
                                  rows={2}
                                  placeholder="Add notes or context..."
                                  className="mt-1"
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 justify-end">
                              {editingGoal?.id === goal.id && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingGoal(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveGoal(goal.id)}
                                    disabled={savingGoalId === goal.id}
                                  >
                                    {savingGoalId === goal.id ? "Saving..." : "Save Changes"}
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteGoal(goal.id)}
                              >
                                Delete
                              </Button>
                            </div>

                            {/* Metadata */}
                            <div className="text-xs text-muted-foreground border-t pt-3">
                              Created {new Date(goal.created_at).toLocaleDateString()}
                              {goal.completed_at &&
                                ` • Completed ${new Date(goal.completed_at).toLocaleDateString()}`}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {discoveryData.goals.annual_revenue_goal && (
        <Card>
          <CardHeader>
            <CardTitle>Annual Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Revenue Goal</p>
              <p className="text-3xl font-bold">
                ${discoveryData.goals.annual_revenue_goal.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current State</CardTitle>
            {!editingCurrentState && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCurrentState(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingCurrentState ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="working" className="text-green-600 dark:text-green-400">
                  What's Working
                </Label>
                <Textarea
                  id="working"
                  value={currentStateForm.working}
                  onChange={(e) =>
                    setCurrentStateForm({ ...currentStateForm, working: e.target.value })
                  }
                  placeholder="Describe what's currently working well..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="not_working" className="text-orange-600 dark:text-orange-400">
                  Not Working
                </Label>
                <Textarea
                  id="not_working"
                  value={currentStateForm.not_working}
                  onChange={(e) =>
                    setCurrentStateForm({ ...currentStateForm, not_working: e.target.value })
                  }
                  placeholder="Describe what's not working or challenges faced..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraints" className="text-muted-foreground">
                  Constraints
                </Label>
                <Textarea
                  id="constraints"
                  value={currentStateForm.constraints}
                  onChange={(e) =>
                    setCurrentStateForm({ ...currentStateForm, constraints: e.target.value })
                  }
                  placeholder="List any constraints or limitations..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelCurrentStateEdit}
                  disabled={savingCurrentState}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveCurrentState}
                  disabled={savingCurrentState}
                >
                  {savingCurrentState ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {currentStateForm.working && (
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                    What's Working
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{currentStateForm.working}</p>
                </div>
              )}
              {currentStateForm.not_working && (
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                    Not Working
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{currentStateForm.not_working}</p>
                </div>
              )}
              {currentStateForm.constraints && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Constraints</p>
                  <p className="text-sm whitespace-pre-wrap">{currentStateForm.constraints}</p>
                </div>
              )}
              {!currentStateForm.working &&
                !currentStateForm.not_working &&
                !currentStateForm.constraints && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No current state information. Click "Edit" to add details.
                  </p>
                )}
            </>
          )}
        </CardContent>
      </Card>

      <AddGoalDialog
        open={addGoalDialogOpen}
        onOpenChange={setAddGoalDialogOpen}
        clientId={clientId}
        onSuccess={onGoalAdded}
      />
    </TabsContent>
  );
}
