import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskTableView } from '../TaskTableView';

const baseColumn = (overrides: Record<string, unknown> = {}) => ({
  id: 'col-1',
  key: 'todo',
  name: 'To Do',
  color: '#999',
  mapped_status: 'todo',
  ...overrides,
});

const baseTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Test task',
  priority: 'medium',
  status: 'todo',
  ...overrides,
});

describe('TaskTableView status label', () => {
  const noop = vi.fn();

  it('resolves label by column_id when task.column_id matches a column', () => {
    const columns = [
      baseColumn({ id: 'col-custom', key: 'custom-key', name: 'In Review', mapped_status: 'in_progress' }),
      baseColumn({ id: 'col-2', key: 'done', name: 'Done', mapped_status: 'done' }),
    ];
    const tasks = [baseTask({ status: 'in_progress', column_id: 'col-custom' })];

    render(
      <TaskTableView
        tasks={tasks}
        taskColumns={columns}
        onTaskClick={noop}
        onCreateTask={noop}
      />
    );

    // Should show the column name "In Review", not raw "in_progress"
    expect(screen.getByText('In Review')).toBeInTheDocument();
    expect(screen.queryByText('in_progress')).not.toBeInTheDocument();
  });

  it('falls back to mapped_status when task has no column_id', () => {
    const columns = [
      baseColumn({ id: 'col-1', key: 'custom-key', name: 'Backlog', mapped_status: 'todo' }),
    ];
    const tasks = [baseTask({ status: 'todo' })]; // no column_id

    render(
      <TaskTableView
        tasks={tasks}
        taskColumns={columns}
        onTaskClick={noop}
        onCreateTask={noop}
      />
    );

    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('shows raw status when no column matches at all', () => {
    const columns = [
      baseColumn({ id: 'col-1', key: 'done', name: 'Done', mapped_status: 'done' }),
    ];
    const tasks = [baseTask({ status: 'unknown_status' })];

    render(
      <TaskTableView
        tasks={tasks}
        taskColumns={columns}
        onTaskClick={noop}
        onCreateTask={noop}
      />
    );

    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});
