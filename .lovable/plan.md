

## Fix Blank Preview

The blank screen is caused by the `.env` file being deleted or overwritten during the previous code changes. Without it, the backend client can't initialize (error: "supabaseUrl is required").

### Fix

**Restore `.env` file** with the correct environment variables:

```
VITE_SUPABASE_PROJECT_ID="hrmhqybdsdngsvhjqwma"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybWhxeWJkc2RuZ3N2aGpxd21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTk2NjcsImV4cCI6MjA3NTY5NTY2N30.STwk-iXJ1_UqNUOYTXZrsMb-TN3pRraXcJNlBcOld1s"
VITE_SUPABASE_URL="https://hrmhqybdsdngsvhjqwma.supabase.co"
```

This is a one-file fix. The preview will immediately start working again once the file is restored.
