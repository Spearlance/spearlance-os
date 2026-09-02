-- Terminal "not doing this" state + a waiting state for task_status.
--
-- One-way: Postgres cannot DROP an enum value (rebuild recipe in
-- supabase/migrations/down/README.md). Only these two values are added here;
-- the AI-QA pipeline states are NOT enum values (see 20260902120001_tasks_qa_state.sql
-- and the audit in docs/task-qa-migration-audit.md for why: in this app
-- `status` is derived from the kanban column, so a status is only stable if a
-- column maps to it).
--
-- Postgres rule: a value added by ALTER TYPE ... ADD VALUE cannot be USED in
-- the same transaction, so the "Cancelled" column seeding lives in the next
-- migration (20260902120002).
--
-- Ordinal: 'blocked' sits before 'done', 'cancelled' after it, so the enum
-- reads to_do, in_progress, blocked, done, cancelled if anything ever sorts by
-- it (nothing does today).

ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'blocked'   BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'cancelled' AFTER  'done';
