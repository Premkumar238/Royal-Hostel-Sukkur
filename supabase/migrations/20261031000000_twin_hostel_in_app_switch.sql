-- Allow Royal Girls Hostel 1 & 2 admins to manage either property in-app (no re-login)

CREATE OR REPLACE FUNCTION has_hostel_access(p_hostel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_platform_admin()
    OR p_hostel_id IN (SELECT get_user_hostel_ids())
    OR (
      can_access_shared_ledger()
      AND p_hostel_id IN (SELECT get_royal_girls_hostel_ids())
    );
$$;

CREATE OR REPLACE FUNCTION get_switchable_hostels()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RETURN (
      SELECT coalesce(json_agg(row_to_json(h) ORDER BY h.name), '[]'::json)
      FROM hostels h
      WHERE h.id IN (SELECT get_user_hostel_ids())
    );
  END IF;

  RETURN (
    SELECT coalesce(json_agg(row_to_json(h) ORDER BY h.slug), '[]'::json)
    FROM hostels h
    WHERE h.slug IN ('royal-girls-hostel-1', 'royal-girls-hostel-2')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_switchable_hostels() TO authenticated;
