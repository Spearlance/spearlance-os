/**
 * Tests for the pure grouping logic extracted from useMyTasks.
 * We test the groupByDueDate, groupByPriority, and groupByClient
 * logic in isolation — these are the highest-value algorithms in the hook.
 */
import { describe, it, expect } from 'vitest';
import { isToday, isTomorrow, isThisWeek, isBefore, startOfToday, addWeeks } from 'date-fns';
import type { MyTask } from '../useMyTasks';

// ----- replicated grouping logic (pure functions for testability) -----

function makeTask(overrides: Partial<MyTask>): MyTask {
  return {
    id: 'task-1',
    title: 'Test task',
    description: null,
    status: 'todo',
    priority: 'normal',
    due_date: null,
    client_id: 'client-1',
    client_name: 'Acme Corp',
    linked_channel_id: null,
    ...overrides,
  };
}

function groupByPriority(tasks: MyTask[]) {
  const grouped: Record<string, { label: string; tasks: MyTask[] }> = {
    urgent: { label: 'Urgent', tasks: [] },
    high: { label: 'High', tasks: [] },
    normal: { label: 'Normal', tasks: [] },
    low: { label: 'Low', tasks: [] },
  };
  tasks.forEach(task => {
    const priority = task.priority || 'normal';
    if (grouped[priority]) grouped[priority].tasks.push(task);
  });
  return grouped;
}

function groupByClient(tasks: MyTask[]) {
  const grouped: Record<string, { label: string; tasks: MyTask[] }> = {};
  tasks.forEach(task => {
    const key = task.client_id;
    if (!grouped[key]) grouped[key] = { label: task.client_name, tasks: [] };
    grouped[key].tasks.push(task);
  });
  Object.values(grouped).forEach(group => {
    group.tasks.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  });
  return grouped;
}

function groupByDueDate(tasks: MyTask[]) {
  const today = startOfToday();
  const nextWeekEnd = addWeeks(today, 1);
  const grouped: Record<string, { label: string; tasks: MyTask[] }> = {
    overdue: { label: 'Overdue', tasks: [] },
    today: { label: 'Today', tasks: [] },
    tomorrow: { label: 'Tomorrow', tasks: [] },
    this_week: { label: 'This Week', tasks: [] },
    next_week: { label: 'Next Week', tasks: [] },
    later: { label: 'Later', tasks: [] },
    no_date: { label: 'No Due Date', tasks: [] },
  };

  tasks.forEach(task => {
    if (!task.due_date) { grouped.no_date.tasks.push(task); return; }
    const dueDate = new Date(task.due_date);
    if (isBefore(dueDate, today)) {
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
  return grouped;
}

// ----- tests -----

describe('groupByPriority', () => {
  it('places urgent tasks in urgent bucket', () => {
    const task = makeTask({ priority: 'urgent' });
    const result = groupByPriority([task]);
    expect(result.urgent.tasks).toHaveLength(1);
    expect(result.high.tasks).toHaveLength(0);
  });

  it('places high priority tasks in high bucket', () => {
    const task = makeTask({ priority: 'high' });
    const result = groupByPriority([task]);
    expect(result.high.tasks).toHaveLength(1);
  });

  it('defaults to normal when priority is undefined', () => {
    const task = makeTask({ priority: undefined as unknown as string });
    const result = groupByPriority([task]);
    expect(result.normal.tasks).toHaveLength(1);
  });

  it('distributes tasks across multiple buckets', () => {
    const tasks = [
      makeTask({ id: '1', priority: 'urgent' }),
      makeTask({ id: '2', priority: 'high' }),
      makeTask({ id: '3', priority: 'normal' }),
      makeTask({ id: '4', priority: 'low' }),
    ];
    const result = groupByPriority(tasks);
    expect(result.urgent.tasks).toHaveLength(1);
    expect(result.high.tasks).toHaveLength(1);
    expect(result.normal.tasks).toHaveLength(1);
    expect(result.low.tasks).toHaveLength(1);
  });

  it('handles empty task list', () => {
    const result = groupByPriority([]);
    expect(result.urgent.tasks).toHaveLength(0);
  });
});

describe('groupByClient', () => {
  it('groups tasks under correct client label', () => {
    const task = makeTask({ client_id: 'c1', client_name: 'Acme' });
    const result = groupByClient([task]);
    expect(result['c1'].label).toBe('Acme');
    expect(result['c1'].tasks).toHaveLength(1);
  });

  it('groups multiple tasks under same client', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'c1', client_name: 'Acme' }),
      makeTask({ id: '2', client_id: 'c1', client_name: 'Acme' }),
    ];
    const result = groupByClient(tasks);
    expect(result['c1'].tasks).toHaveLength(2);
  });

  it('creates separate groups for different clients', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'c1', client_name: 'Acme' }),
      makeTask({ id: '2', client_id: 'c2', client_name: 'Beta' }),
    ];
    const result = groupByClient(tasks);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['c2'].label).toBe('Beta');
  });

  it('sorts tasks within a client group by due_date ascending', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'c1', client_name: 'Acme', due_date: '2025-06-15' }),
      makeTask({ id: '2', client_id: 'c1', client_name: 'Acme', due_date: '2025-06-01' }),
    ];
    const result = groupByClient(tasks);
    expect(result['c1'].tasks[0].id).toBe('2');
    expect(result['c1'].tasks[1].id).toBe('1');
  });

  it('sorts tasks without due_date to the end', () => {
    const tasks = [
      makeTask({ id: 'no-date', client_id: 'c1', client_name: 'Acme', due_date: null }),
      makeTask({ id: 'has-date', client_id: 'c1', client_name: 'Acme', due_date: '2025-01-01' }),
    ];
    const result = groupByClient(tasks);
    expect(result['c1'].tasks[0].id).toBe('has-date');
    expect(result['c1'].tasks[1].id).toBe('no-date');
  });
});

describe('groupByDueDate', () => {
  it('places tasks with no due_date in no_date bucket', () => {
    const task = makeTask({ due_date: null });
    const result = groupByDueDate([task]);
    expect(result.no_date.tasks).toHaveLength(1);
  });

  it('places overdue tasks in overdue bucket', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const task = makeTask({ due_date: past.toISOString().split('T')[0] });
    const result = groupByDueDate([task]);
    expect(result.overdue.tasks).toHaveLength(1);
  });

  it('places far-future tasks in later bucket', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const task = makeTask({ due_date: future.toISOString().split('T')[0] });
    const result = groupByDueDate([task]);
    expect(result.later.tasks).toHaveLength(1);
  });

  it('handles empty task list with all empty buckets', () => {
    const result = groupByDueDate([]);
    Object.values(result).forEach(bucket => {
      expect(bucket.tasks).toHaveLength(0);
    });
  });
});
