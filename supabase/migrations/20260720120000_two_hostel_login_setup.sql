-- Royal Girls Hostels — two logins (one Supabase Auth user per property)
--
-- BEFORE running this SQL, create users in Supabase Dashboard → Authentication → Users:
--   Email: royal-girls-hostel-1@hostel.local   Password: hostelpass1
--   Email: royal-girls-hostel-2@hostel.local   Password: hostelpass2
-- Enable "Auto Confirm User" for each.
--
-- If you already have one hostel with students/rooms, rename it instead of duplicating:
--   UPDATE hostels SET name = 'Royal Girls Hostel 1', slug = 'royal-girls-hostel-1'
--   WHERE id = '<your-existing-hostel-id>';

INSERT INTO hostels (name, slug)
VALUES
  ('Royal Girls Hostel 1', 'royal-girls-hostel-1'),
  ('Royal Girls Hostel 2', 'royal-girls-hostel-2')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

-- Hostel 1 admin
INSERT INTO profiles (id, full_name, role)
SELECT u.id, 'Royal Girls Hostel 1', 'hostel_super_admin'::user_role
FROM auth.users u
WHERE lower(u.email) = lower('royal-girls-hostel-1@hostel.local')
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

INSERT INTO hostel_members (hostel_id, user_id, role, is_active)
SELECT h.id, u.id, 'hostel_super_admin'::user_role, true
FROM hostels h
JOIN auth.users u ON lower(u.email) = lower('royal-girls-hostel-1@hostel.local')
WHERE h.slug = 'royal-girls-hostel-1'
ON CONFLICT (hostel_id, user_id) DO UPDATE
SET role = EXCLUDED.role,
    is_active = true;

-- Hostel 2 admin
INSERT INTO profiles (id, full_name, role)
SELECT u.id, 'Royal Girls Hostel 2', 'hostel_super_admin'::user_role
FROM auth.users u
WHERE lower(u.email) = lower('royal-girls-hostel-2@hostel.local')
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

INSERT INTO hostel_members (hostel_id, user_id, role, is_active)
SELECT h.id, u.id, 'hostel_super_admin'::user_role, true
FROM hostels h
JOIN auth.users u ON lower(u.email) = lower('royal-girls-hostel-2@hostel.local')
WHERE h.slug = 'royal-girls-hostel-2'
ON CONFLICT (hostel_id, user_id) DO UPDATE
SET role = EXCLUDED.role,
    is_active = true;
