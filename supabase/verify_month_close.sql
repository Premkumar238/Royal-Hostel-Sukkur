-- Paste in Supabase SQL Editor to see what is installed and test month close.

-- 1) Main close function exists?
SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'auto_close_all_hostels_cron'
) AS has_auto_close_all_hostels_cron;

-- 2) pg_cron enabled?
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'pg_cron';

-- 3) Scheduled job (only if pg_cron works)
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'royal-hostel-auto-month-close';

-- 4) Recent closures
SELECT h.name, mc.billing_month, mc.closed_at
FROM month_closures mc
JOIN hostels h ON h.id = mc.hostel_id
ORDER BY mc.closed_at DESC
LIMIT 10;

-- 5) Manual run (safe — idempotent; skips already-closed months)
SELECT public.auto_close_all_hostels_cron();
