-- One-time: set login passwords for Royal Girls Hostel 1 & 2
-- Run in Supabase → SQL Editor (uses auth.users; safe to re-run)
--
-- Login emails (default):
--   Hostel 1 → hostel1@royalgirls.com  /  waheguru21
--   Hostel 2 → hostel2@royalgirls.com  /  waheguru22

UPDATE auth.users
SET
  encrypted_password = extensions.crypt('waheguru21', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
WHERE lower(email) = lower('hostel1@royalgirls.com');

UPDATE auth.users
SET
  encrypted_password = extensions.crypt('waheguru22', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
WHERE lower(email) = lower('hostel2@royalgirls.com');
