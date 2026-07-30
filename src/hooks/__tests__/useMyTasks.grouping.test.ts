/**
 * Tests for the pure grouping logic behind useMyTasks and the My Tasks
 * client-card view. These import the real implementations from
 * src/lib/myTasksGrouping.ts (previously the test re-implemented them).
 */
import { describe, it, expect } from 'vitest';
import type { MyTask } from '../useMyTasks';
import {
  groupTasksByClient,
  groupTasksByDueDate,
  groupTasksByPriority,
  buildClientSummaries,
  isTaskDone,
} from '@/lib/myTasksGrouping';

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

/** Local date string N days from today (local midnight, avoids UTC parsing skew). */
function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ----- tests -----

describe('groupTasksByPriority', () => {
  it('places urgent tasks in urgent bucket', () => {
    const task = makeTask({ priority: 'urgent' });
    const result = groupTasksByPriority([task]);
    expect(result.urgent.tasks).toHaveLength(1);
    expect(result.high.tasks).toHaveLength(0);
  });

  it('places high priority tasks in high bucket', () => {
    const task = makeTask({ priority: 'high' });
    const result = groupTasksByPriority([task]);
    expect(result.high.tasks).toHaveLength(1);
  });

  it('defaults to normal when priority is undefined', () => {
    const task = makeTask({ priority: undefined as unknown as string });
    const result = groupTasksByPriority([task]);
    expect(result.normal.tasks).toHaveLength(1);
  });

  it('distributes tasks across multiple buckets', () => {
    const tasks = [
      makeTask({ id: '1', priority: 'urgent' }),
      makeTask({ id: '2', priority: 'high' }),
      makeTask({ id: '3', priority: 'normal' }),
      makeTask({ id: '4', priority: 'low' }),
    ];
    const result = groupTasksByPriority(tasks);
    expect(result.urgent.tasks).toHaveLength(1);
    expect(result.high.tasks).toHaveLength(1);
    expect(result.normal.tasks).toHaveLength(1);
    expect(result.low.tasks).toHaveLength(1);
  });

  it('handles empty task list', () => {
    const result = groupTasksByPriority([]);
    expect(result.urgent.tasks).toHaveLength(0);
  });
});

describe('groupTasksByClient', () => {
  it('groups tasks under correct client label', () => {
    const task = makeTask({ client_id: 'c1', client_name: 'Acme' });
    const result = groupTasksByClient([task]);
    expect(result['c1'].label).toBe('Acme');
    expect(result['c1'].tasks).toHaveLength(1);
  });

  it('groups multiple tasks under same client', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'c1', client_name: 'Acme' }),
      makeTask({ id: '2', client_id: 'c1', client_name: 'Acme' }),
    ];
    const result = groupTasksByClient(tasks);
    expect(result['c1'].tasks).toHaveLength(2);
  });

  it('creates separate groups for different clients', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'c1', client_name: 'Acme' }),
      makeTask({ id: '2', client_id: 'c2', client_name: 'Beta' }),
    ];
    const result = groupTasksByClient(tasks);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['c2'].label).toBe('Beta');
  });

  it('sorts tasks within a client group by due_date ascending', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'c1', due_date: '2025-06-15' }),
      makeTask({ id: '2', client_id: 'c1', due_date: '2025-06-01' }),
    ];
    const result = groupTasksByClient(tasks);
    expect(result['c1'].tasks[0].id).toBe('2');
    expect(result['c1'].tasks[1].id).toBe('1');
  });

  it('sorts tasks without due_date to the end', () => {
    const tasks = [
      makeTask({ id: 'no-date', client_id: 'c1', due_date: null }),
      makeTask({ id: 'has-date', client_id: 'c1', due_date: '2025-01-01' }),
    ];
    const result = groupTasksByClient(tasks);
    expect(result['c1'].tasks[0].id).toBe('has-date');
    expect(result['c1'].tasks[1].id).toBe('no-date');
  });
});

describe('groupTasksByDueDate', () => {
  it('places tasks with no due_date in no_date bucket', () => {
    const task = makeTask({ due_date: null });
    const result = groupTasksByDueDate([task]);
    expect(result.no_date.tasks).toHaveLength(1);
  });

  it('places recently overdue tasks (under 7 days) in overdue bucket', () => {
    const task = makeTask({ due_date: daysFromToday(-5) });
    const result = groupTasksByDueDate([task]);
    expect(result.overdue.tasks).toHaveLength(1);
    expect(result.overdue_old.tasks).toHaveLength(0);
  });

  it('places tasks overdue 7+ days in overdue_old bucket', () => {
    const task = makeTask({ due_date: daysFromToday(-10) });
    const result = groupTasksByDueDate([task]);
    expect(result.overdue_old.tasks).toHaveLength(1);
    expect(result.overdue.tasks).toHaveLength(0);
  });

  it('places far-future tasks in later bucket', () => {
    const task = makeTask({ due_date: daysFromToday(365) });
    const result = groupTasksByDueDate([task]);
    expect(result.later.tasks).toHaveLength(1);
  });

  it('sorts tasks within a bucket by due_date ascending', () => {
    const tasks = [
      makeTask({ id: 'newer', due_date: daysFromToday(-2) }),
      makeTask({ id: 'older', due_date: daysFromToday(-5) }),
    ];
    const result = groupTasksByDueDate(tasks);
    expect(result.overdue.tasks[0].id).toBe('older');
    expect(result.overdue.tasks[1].id).toBe('newer');
  });

  it('handles empty task list with all empty buckets', () => {
    const result = groupTasksByDueDate([]);
    Object.values(result).forEach(bucket => {
      expect(bucket.tasks).toHaveLength(0);
    });
  });
});

describe('isTaskDone', () => {
  it('is done when status is done', () => {
    expect(isTaskDone('done', null)).toBe(true);
    expect(isTaskDone('done', 'in_progress')).toBe(true);
  });

  it('is done when the column is mapped to done even if status is stale', () => {
    expect(isTaskDone('in_progress', 'done')).toBe(true);
    expect(isTaskDone('to_do', 'done')).toBe(true);
  });

  it('is open otherwise', () => {
    expect(isTaskDone('to_do', 'to_do')).toBe(false);
    expect(isTaskDone('in_progress', null)).toBe(false);
    expect(isTaskDone('in_progress', undefined)).toBe(false);
    expect(isTaskDone(null, null)).toBe(false);
  });
});

describe('buildClientSummaries', () => {
  it('splits a client\'s tasks into overdue, upcoming, and noDate', () => {
    const tasks = [
      makeTask({ id: 'late', client_id: 'c1', due_date: daysFromToday(-3) }),
      makeTask({ id: 'soon', client_id: 'c1', due_date: daysFromToday(3) }),
      makeTask({ id: 'undated', client_id: 'c1', due_date: null }),
    ];
    const [summary] = buildClientSummaries(tasks);
    expect(summary.overdue.map(t => t.id)).toEqual(['late']);
    expect(summary.upcoming.map(t => t.id)).toEqual(['soon']);
    expect(summary.noDate.map(t => t.id)).toEqual(['undated']);
    expect(summary.total).toBe(3);
  });

  it('sorts overdue most-overdue-first and upcoming soonest-first', () => {
    const tasks = [
      makeTask({ id: 'late-2d', client_id: 'c1', due_date: daysFromToday(-2) }),
      makeTask({ id: 'late-9d', client_id: 'c1', due_date: daysFromToday(-9) }),
      makeTask({ id: 'in-10d', client_id: 'c1', due_date: daysFromToday(10) }),
      makeTask({ id: 'in-1d', client_id: 'c1', due_date: daysFromToday(1) }),
    ];
    const [summary] = buildClientSummaries(tasks);
    expect(summary.overdue.map(t => t.id)).toEqual(['late-9d', 'late-2d']);
    expect(summary.upcoming.map(t => t.id)).toEqual(['in-1d', 'in-10d']);
  });

  it('orders clients with overdue tasks before clients without', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'ok', client_name: 'All Good', due_date: daysFromToday(2) }),
      makeTask({ id: '2', client_id: 'late', client_name: 'Behind', due_date: daysFromToday(-1) }),
    ];
    const summaries = buildClientSummaries(tasks);
    expect(summaries.map(s => s.clientId)).toEqual(['late', 'ok']);
  });

  it('orders clients with older overdue tasks first', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'a', client_name: 'A', due_date: daysFromToday(-2) }),
      makeTask({ id: '2', client_id: 'b', client_name: 'B', due_date: daysFromToday(-8) }),
    ];
    const summaries = buildClientSummaries(tasks);
    expect(summaries.map(s => s.clientId)).toEqual(['b', 'a']);
  });

  it('falls back to name ordering for clients with only undated tasks', () => {
    const tasks = [
      makeTask({ id: '1', client_id: 'z', client_name: 'Zeta', due_date: null }),
      makeTask({ id: '2', client_id: 'a', client_name: 'Alpha', due_date: null }),
    ];
    const summaries = buildClientSummaries(tasks);
    expect(summaries.map(s => s.clientName)).toEqual(['Alpha', 'Zeta']);
  });

  it('carries client logo through to the summary', () => {
    const tasks = [
      makeTask({ client_id: 'c1', client_logo_url: 'https://cdn/logo.png' }),
    ];
    const [summary] = buildClientSummaries(tasks);
    expect(summary.clientLogoUrl).toBe('https://cdn/logo.png');
  });
});
