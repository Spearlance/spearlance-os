-- Add denial tracking columns to bug_reports table
ALTER TABLE bug_reports
ADD COLUMN denial_reason text,
ADD COLUMN denied_at timestamp with time zone,
ADD COLUMN denied_by uuid REFERENCES profiles(id);

-- Add denied status to enum
ALTER TYPE bug_report_status ADD VALUE IF NOT EXISTS 'denied';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_denied_by ON bug_reports(denied_by);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);

-- Add comment explaining the denial fields
COMMENT ON COLUMN bug_reports.denial_reason IS 'Explanation from admin for why the bug report was denied (not a valid bug)';
COMMENT ON COLUMN bug_reports.denied_at IS 'Timestamp when the report was denied';
COMMENT ON COLUMN bug_reports.denied_by IS 'Admin user who denied the report';