# Down migrations

Files here are **not** picked up by the Supabase CLI or by `.claude/tmp/applymig.sh`
(both only read top-level `supabase/migrations/*.sql`). Run one by hand via the
Management API query endpoint (`.claude/tmp/devsql.sh -f <file>`), then delete the
matching row from `supabase_migrations.schema_migrations`. Run them in reverse order.

| Up migration | Down |
|---|---|
| `20260902100001_tasks_qa_context.sql` | `20260902100001_tasks_qa_context.down.sql` |
| `20260902100002_task_qa_runs.sql` | `20260902100002_task_qa_runs.down.sql` |
| `20260902120000_task_status_add_cancelled_blocked.sql` | **none, see below** |
| `20260902120001_tasks_qa_state.sql` | `20260902120001_tasks_qa_state.down.sql` |
| `20260902120002_task_columns_cancelled.sql` | `20260902120002_task_columns_cancelled.down.sql` |
| `gated/20260902130000_task_status_add_pipeline_values.sql` | held, never applied |

## Why there is no down for an enum change

Postgres has no `ALTER TYPE ... DROP VALUE`. The only way back is to rebuild the type,
which is safe **only while no row uses a new value**:

```sql
-- 1. make sure nothing uses the new values (both counts must be 0)
select count(*) from public.tasks        where status        not in ('to_do','in_progress','done');
select count(*) from public.task_columns where mapped_status not in ('to_do','in_progress','done');

-- 2. rebuild
alter type public.task_status rename to task_status_old;
create type public.task_status as enum ('to_do','in_progress','done');
alter table public.tasks
  alter column status drop default,
  alter column status type public.task_status using status::text::public.task_status,
  alter column status set default 'to_do';
alter table public.task_columns
  alter column mapped_status drop default,
  alter column mapped_status type public.task_status using mapped_status::text::public.task_status,
  alter column mapped_status set default 'in_progress';
drop type public.task_status_old;
```

Triggers and functions that compare `status` to string literals keep working across the
rebuild; anything that referenced the type by name in a signature would need recreating
(none do today).
