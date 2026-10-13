-- Remove operational expense rows before the current month (Expense Records reset).

CREATE OR REPLACE FUNCTION purge_operational_expenses_before_month(
  p_hostel_id uuid,
  p_from_month date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH deleted AS (
    DELETE FROM expenses e
    WHERE e.hostel_id = p_hostel_id
      AND e.expense_date < p_from_month
      AND e.employee_id IS NULL
      AND coalesce(is_ledger_vendor(e.vendor), false) = false
      AND e.title NOT LIKE 'Payment — %'
      AND NOT EXISTS (
        SELECT 1
        FROM expense_categories ec
        WHERE ec.id = e.category_id
          AND ec.name IN ('Mess - Daily', 'Mess - Initial')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM expense_categories ec
        WHERE ec.id = e.category_id
          AND lower(ec.name) = 'salary'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM expense_categories ec
        WHERE ec.id = e.category_id
          AND ec.name IN ('Watchman', 'Cook', 'Cleaner', 'Manager', 'Other')
      )
      AND lower(coalesce(e.vendor, '')) <> 'mess'
      AND coalesce(e.title, '') NOT ILIKE '%mess expense%'
      AND lower(coalesce(e.title, '')) NOT LIKE '% salary%'
      AND lower(coalesce(e.title, '')) NOT LIKE '%salary -%'
    RETURNING e.id
  )
  SELECT count(*)::integer INTO v_deleted FROM deleted;

  RETURN coalesce(v_deleted, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION purge_operational_expenses_before_month(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION clear_operational_expense_records(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_end date;
BEGIN
  v_month_end := (p_billing_month + interval '1 month' - interval '1 day')::date;

  DELETE FROM expenses e
  WHERE e.hostel_id = p_hostel_id
    AND e.expense_date >= p_billing_month
    AND e.expense_date <= v_month_end
    AND e.employee_id IS NULL
    AND coalesce(is_ledger_vendor(e.vendor), false) = false
    AND e.title NOT LIKE 'Payment — %'
    AND NOT EXISTS (
      SELECT 1
      FROM expense_categories ec
      WHERE ec.id = e.category_id
        AND ec.name IN ('Mess - Daily', 'Mess - Initial')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM expense_categories ec
      WHERE ec.id = e.category_id
        AND lower(ec.name) = 'salary'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM expense_categories ec
      WHERE ec.id = e.category_id
        AND ec.name IN ('Watchman', 'Cook', 'Cleaner', 'Manager', 'Other')
    )
    AND lower(coalesce(e.vendor, '')) <> 'mess'
    AND coalesce(e.title, '') NOT ILIKE '%mess expense%'
    AND lower(coalesce(e.title, '')) NOT LIKE '% salary%'
    AND lower(coalesce(e.title, '')) NOT LIKE '%salary -%';
END;
$$;

CREATE OR REPLACE FUNCTION auto_close_hostel_months(p_hostel_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current date := date_trunc('month', current_date)::date;
  v_last date;
  v_month date;
  v_closed_months jsonb := '[]'::jsonb;
  v_fees_created integer;
  v_did_close boolean := false;
  v_expenses_purged integer := 0;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT last_closed_month INTO v_last
  FROM hostels
  WHERE id = p_hostel_id
  FOR UPDATE;

  IF v_last IS NULL THEN
    v_last := (v_current - interval '1 month')::date;
  END IF;

  v_month := (v_last + interval '1 month')::date;
  WHILE v_month < v_current LOOP
    PERFORM close_hostel_month(p_hostel_id, v_month);
    v_closed_months := v_closed_months || to_jsonb(v_month);
    v_did_close := true;
    v_month := (v_month + interval '1 month')::date;
  END LOOP;

  UPDATE hostels
  SET last_closed_month = (v_current - interval '1 month')::date
  WHERE id = p_hostel_id;

  v_fees_created := generate_month_pending_fees(p_hostel_id, v_current);
  v_expenses_purged := purge_operational_expenses_before_month(p_hostel_id, v_current);

  RETURN json_build_object(
    'current_month', v_current,
    'closed_months', v_closed_months,
    'did_close', v_did_close,
    'fees_created', v_fees_created,
    'expenses_purged', v_expenses_purged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION auto_close_hostel_months(uuid) TO authenticated;
