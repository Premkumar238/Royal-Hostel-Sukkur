-- Clear operational expense records when a month is closed (totals saved in month_closures snapshot).

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
    AND lower(coalesce(e.vendor, '')) <> 'mess'
    AND coalesce(e.title, '') NOT ILIKE '%mess expense%'
    AND lower(coalesce(e.title, '')) NOT LIKE '% salary%'
    AND lower(coalesce(e.title, '')) NOT LIKE '%salary -%';
END;
$$;

GRANT EXECUTE ON FUNCTION clear_operational_expense_records(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION close_hostel_month(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_income numeric;
  v_expenses numeric;
  v_pending numeric;
  v_month_end date;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_month_end := (p_billing_month + interval '1 month' - interval '1 day')::date;

  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM fee_records
  WHERE hostel_id = p_hostel_id
    AND status = 'paid'
    AND billing_month = p_billing_month;

  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM expenses
  WHERE hostel_id = p_hostel_id
    AND expense_date >= p_billing_month
    AND expense_date <= v_month_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM fee_records
  WHERE hostel_id = p_hostel_id
    AND status IN ('pending', 'partial')
    AND billing_month = p_billing_month;

  INSERT INTO month_closures (hostel_id, billing_month, closed_at, closed_by, snapshot)
  VALUES (
    p_hostel_id,
    p_billing_month,
    now(),
    auth.uid(),
    jsonb_build_object(
      'monthly_income', v_income,
      'monthly_expenses', v_expenses,
      'pending_fees', v_pending,
      'net_profit', v_income - v_expenses
    )
  )
  ON CONFLICT (hostel_id, billing_month) DO NOTHING;

  PERFORM clear_operational_expense_records(p_hostel_id, p_billing_month);
END;
$$;
