-- Shared ledger across Royal Girls Hostel 1 & 2 (same data for both logins)

CREATE OR REPLACE FUNCTION get_royal_girls_hostel_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM hostels
  WHERE slug IN ('royal-girls-hostel-1', 'royal-girls-hostel-2');
$$;

CREATE OR REPLACE FUNCTION is_ledger_vendor(p_vendor text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_vendor IN ('Ameet Lalwani', 'Khairpur Home', 'Sain Amjad');
$$;

CREATE OR REPLACE FUNCTION can_access_shared_ledger()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hostel_members hm
    JOIN hostels h ON h.id = hm.hostel_id
    WHERE hm.user_id = auth.uid()
      AND hm.is_active = true
      AND h.slug IN ('royal-girls-hostel-1', 'royal-girls-hostel-2')
  );
$$;

-- Read ledger payments recorded under either hostel
DROP POLICY IF EXISTS "Shared ledger select expenses" ON expenses;
CREATE POLICY "Shared ledger select expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND is_ledger_vendor(vendor)
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

-- Delete ledger payments from either hostel
DROP POLICY IF EXISTS "Shared ledger delete expenses" ON expenses;
CREATE POLICY "Shared ledger delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND is_ledger_vendor(vendor)
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

-- Allow reading both hostel names on the shared ledger screen
DROP POLICY IF EXISTS "Shared ledger read hostels" ON hostels;
CREATE POLICY "Shared ledger read hostels"
  ON hostels FOR SELECT
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND slug IN ('royal-girls-hostel-1', 'royal-girls-hostel-2')
  );
