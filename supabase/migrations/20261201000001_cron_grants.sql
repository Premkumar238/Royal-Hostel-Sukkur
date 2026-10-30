-- Allow postgres (pg_cron / SQL editor) to run scheduled month close
GRANT EXECUTE ON FUNCTION public.auto_close_all_hostels_cron() TO postgres;
