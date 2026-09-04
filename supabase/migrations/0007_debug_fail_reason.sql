-- Dev-only per-job failure override for the E2E test harness.
-- The agent reads this via GET /api/agent/jobs/next and honours it in simulate/virtual/real modes.
-- Ignored entirely when PRINTBUDDY_PRINT_MODE is checked against NODE_ENV=production guards.

ALTER TABLE print_jobs
  ADD COLUMN IF NOT EXISTS debug_fail_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN print_jobs.debug_fail_reason
  IS 'Dev-only: if set, the agent reports this as the print failure reason instead of printing. Ignored in production.';
