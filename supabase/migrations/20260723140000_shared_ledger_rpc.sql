-- Fetch shared ledger via RPC (bypasses RLS issues on cross-hostel reads)

CREATE OR REPLACE FUNCTION get_shared_ledger_payments(p_start date, p_end date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.expense_date DESC), '[]'::json)
    FROM (
      SELECT
        e.id,
        e.hostel_id,
        e.category_id,
        e.employee_id,
        e.title,
        e.description,
        COALESCE(
          NULLIF(e.vendor, ''),
          NULLIF(regexp_replace(e.title, '^Payment — ', ''), e.title)
        ) AS vendor,
        e.amount,
        e.expense_date,
        e.status,
        e.created_at,
        e.updated_at,
        h.name AS hostel_name
      FROM expenses e
      JOIN hostels h ON h.id = e.hostel_id
      WHERE e.hostel_id IN (SELECT get_royal_girls_hostel_ids())
        AND (
          is_ledger_vendor(e.vendor)
          OR e.title LIKE 'Payment — %'
        )
        AND e.expense_date >= p_start
        AND e.expense_date <= p_end
    ) t
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_ledger_payments(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION delete_shared_ledger_payment(p_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense expenses%ROWTYPE;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_expense.hostel_id NOT IN (SELECT get_royal_girls_hostel_ids()) THEN
    RAISE EXCEPTION 'Not a shared ledger payment';
  END IF;

  IF NOT is_ledger_vendor(v_expense.vendor) AND v_expense.title NOT LIKE 'Payment — %' THEN
    RAISE EXCEPTION 'Not a ledger payment';
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_shared_ledger_payment(uuid) TO authenticated;
