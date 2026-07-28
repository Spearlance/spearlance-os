import { isToday, isTomorrow, isThisWeek, isBefore, startOfToday, addWeeks, subDays } from "date-fns";
import type { MyTask } from "@/hooks/useMyTasks";

export interface GroupedTasks {
  [key: string]: {
    label: string;
    tasks: MyTask[];
    color?: string;
  };
}

export interface ClientTaskSummary {
  clientId: string;
  clientName: string;
  clientLogoUrl?: string;
  overdue: MyTask[];
  upcoming: MyTask[];
  noDate: MyTask[];
  total: number;
}

const byDueDateAsc = (a: MyTask, b: MyTask) => {
  if (!a.due_date && !b.due_date) return 0;
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
};

export function isOverdue(task: MyTask): boolean {
  return !!task.due_date && isBefore(new Date(task.due_date), startOfToday());
}

export function groupTasksByClient(tasks: MyTask[]): GroupedTasks {
  const grouped: GroupedTasks = {};

  tasks.forEach(task => {
    const key = task.client_id;
    if (!grouped[key]) {
      grouped[key] = {
        label: task.client_name,
        tasks: [],
      };
    }
    grouped[key].tasks.push(task);
  });

  Object.values(grouped).forEach(group => {
    group.tasks.sort(byDueDateAsc);
  });

  return grouped;
}

export function groupTasksByDueDate(tasks: MyTask[]): GroupedTasks {
  const today = startOfToday();
  const nextWeekEnd = addWeeks(today, 1);
  const recentOverdueCutoff = subDays(today, 7);

  const grouped: GroupedTasks = {
    overdue: { label: "Overdue", tasks: [], color: "hsl(var(--destructive))" },
    overdue_old: { label: "Overdue 7+ Days", tasks: [], color: "hsl(var(--destructive))" },
    today: { label: "Today", tasks: [], color: "hsl(var(--primary))" },
    tomorrow: { label: "Tomorrow", tasks: [], color: "hsl(var(--warning))" },
    this_week: { label: "This Week", tasks: [], color: "hsl(var(--muted-foreground))" },
    next_week: { label: "Next Week", tasks: [], color: "hsl(var(--muted-foreground))" },
    later: { label: "Later", tasks: [], color: "hsl(var(--muted-foreground))" },
    no_date: { label: "No Due Date", tasks: [], color: "hsl(var(--muted-foreground))" },
  };

  tasks.forEach(task => {
    if (!task.due_date) {
      grouped.no_date.tasks.push(task);
      return;
    }

    const dueDate = new Date(task.due_date);

    if (isBefore(dueDate, recentOverdueCutoff)) {
      grouped.overdue_old.tasks.push(task);
    } else if (isBefore(dueDate, today)) {
      grouped.overdue.tasks.push(task);
    } else if (isToday(dueDate)) {
      grouped.today.tasks.push(task);
    } else if (isTomorrow(dueDate)) {
      grouped.tomorrow.tasks.push(task);
    } else if (isThisWeek(dueDate, { weekStartsOn: 1 })) {
      grouped.this_week.tasks.push(task);
    } else if (isBefore(dueDate, nextWeekEnd)) {
      grouped.next_week.tasks.push(task);
    } else {
      grouped.later.tasks.push(task);
    }
  });

  Object.values(grouped).forEach(group => {
    group.tasks.sort(byDueDateAsc);
  });

  return grouped;
}

export function groupTasksByPriority(tasks: MyTask[]): GroupedTasks {
  const grouped: GroupedTasks = {
    urgent: { label: "Urgent", tasks: [], color: "#EF4444" },
    high: { label: "High", tasks: [], color: "#F59E0B" },
    normal: { label: "Normal", tasks: [], color: "#10B981" },
    low: { label: "Low", tasks: [], color: "#6B7280" },
  };

  tasks.forEach(task => {
    const priority = task.priority || "normal";
    if (grouped[priority]) {
      grouped[priority].tasks.push(task);
    }
  });

  Object.values(grouped).forEach(group => {
    group.tasks.sort(byDueDateAsc);
  });

  return grouped;
}

/**
 * One summary per client: overdue tasks (most overdue first), upcoming tasks
 * (soonest first), and undated tasks. Summaries are ordered so the clients
 * needing attention surface first: earliest overdue task wins, then soonest
 * upcoming task, then client name.
 */
export function buildClientSummaries(tasks: MyTask[]): ClientTaskSummary[] {
  const byClient = new Map<string, ClientTaskSummary>();

  tasks.forEach(task => {
    let summary = byClient.get(task.client_id);
    if (!summary) {
      summary = {
        clientId: task.client_id,
        clientName: task.client_name,
        clientLogoUrl: task.client_logo_url,
        overdue: [],
        upcoming: [],
        noDate: [],
        total: 0,
      };
      byClient.set(task.client_id, summary);
    }

    summary.total++;
    if (!task.due_date) {
      summary.noDate.push(task);
    } else if (isOverdue(task)) {
      summary.overdue.push(task);
    } else {
      summary.upcoming.push(task);
    }
  });

  const summaries = Array.from(byClient.values());
  summaries.forEach(s => {
    s.overdue.sort(byDueDateAsc);
    s.upcoming.sort(byDueDateAsc);
  });

  const earliestDate = (s: ClientTaskSummary) => {
    const first = s.overdue[0] ?? s.upcoming[0];
    return first?.due_date ? new Date(first.due_date).getTime() : Number.POSITIVE_INFINITY;
  };

  summaries.sort((a, b) => {
    const aHasOverdue = a.overdue.length > 0;
    const bHasOverdue = b.overdue.length > 0;
    if (aHasOverdue !== bHasOverdue) return aHasOverdue ? -1 : 1;
    const dateDiff = earliestDate(a) - earliestDate(b);
    if (!Number.isNaN(dateDiff) && dateDiff !== 0) return dateDiff;
    return a.clientName.localeCompare(b.clientName);
  });

  return summaries;
}
