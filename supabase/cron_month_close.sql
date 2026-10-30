-- Automatic month close scheduler (optional — requires pg_cron)
--
-- STEP 1 — Enable extension in Supabase Dashboard:
--   Database → Extensions → search "pg_cron" → Enable
--   (If pg_cron is not listed, your plan/region may not support it; see FALLBACK below.)
--
-- STEP 2 — Run this entire file in SQL Editor (after migration 20261201000000).

-- Allow cron / SQL editor (postgres) to invoke the close job
GRANT EXECUTE ON FUNCTION public.auto_close_all_hostels_cron() TO postgres;

DO $setup$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION pg_cron;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot create pg_cron here. Enable it under Database → Extensions in the dashboard, then run this script again.';
        RETURN;
      WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available: %. Use FALLBACK below.', SQLERRM;
        RETURN;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE NOTICE 'pg_cron extension is not active (no cron schema). Enable pg_cron in Dashboard → Extensions, then re-run this script.';
    RETURN;
  END IF;

  PERFORM cron.unschedule(j.jobid)
  FROM cron.job AS j
  WHERE j.jobname = 'royal-hostel-auto-month-close';

  PERFORM cron.schedule(
    'royal-hostel-auto-month-close',
    '5 * * * *',
    $job$SELECT public.auto_close_all_hostels_cron();$job$
  );

  RAISE NOTICE 'Scheduled royal-hostel-auto-month-close (every hour at :05, hostel timezone inside RPC).';
END;
$setup$;

-- Verify (only works if pg_cron is enabled):
-- SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'royal-hostel-auto-month-close';

-- ---------------------------------------------------------------------------
-- FALLBACK if pg_cron is not available on your Supabase project:
--   1. Month close still runs when an admin logs in (MonthCloseRunner in the app).
--   2. Run manually at the start of each month (SQL Editor):
--        SELECT public.auto_close_all_hostels_cron();
--   3. Or use Supabase Dashboard → Integrations → Cron / Edge Function on a schedule
--      that calls the same SQL with the service role.
-- ---------------------------------------------------------------------------
