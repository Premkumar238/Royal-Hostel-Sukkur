-- Mess summary RPC, admission fees table, dashboard + chart income fixes

CREATE TABLE IF NOT EXISTS admission_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  payment_date date NOT NULL DEFAULT (current_date),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, student_id)
);

CREATE INDEX IF NOT EXISTS admission_fees_hostel_id_idx ON admission_fees(hostel_id);
CREATE INDEX IF NOT EXISTS admission_fees_payment_date_idx ON admission_fees(payment_date);

ALTER TABLE admission_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admission_fees_select" ON admission_fees;
CREATE POLICY "admission_fees_select"
  ON admission_fees FOR SELECT
  USING (has_hostel_access(hostel_id));

DROP POLICY IF EXISTS "admission_fees_insert" ON admission_fees;
CREATE POLICY "admission_fees_insert"
  ON admission_fees FOR INSERT
  WITH CHECK (has_hostel_access(hostel_id));

DROP POLICY IF EXISTS "admission_fees_update" ON admission_fees;
CREATE POLICY "admission_fees_update"
  ON admission_fees FOR UPDATE
  USING (has_hostel_access(hostel_id))
  WITH CHECK (has_hostel_access(hostel_id));

DROP POLICY IF EXISTS "admission_fees_delete" ON admission_fees;
CREATE POLICY "admission_fees_delete"
  ON admission_fees FOR DELETE
  USING (has_hostel_access(hostel_id));

CREATE OR REPLACE FUNCTION get_shared_mess_month_summary(p_billing_month date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_billing_month)::date;
  v_income numeric;
  v_expenses numeric;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT coalesce(sum(fr.amount), 0) INTO v_income
  FROM fee_records fr
  WHERE fr.hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND fr.fee_type = 'mess'
    AND fr.status IN ('paid', 'partial')
    AND fr.billing_month = v_month_start;

  SELECT coalesce(sum(me.amount), 0) INTO v_expenses
  FROM mess_expenses me
  WHERE me.hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND me.billing_month = v_month_start
    AND me.expense_type = 'daily';

  RETURN json_build_object(
    'total_income', v_income,
    'total_expenses', v_expenses,
    'mess_profit', v_income - v_expenses,
    'billing_month', v_month_start
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_mess_month_summary(date) TO authenticated;

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hostel_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_month_start date := date_trunc('month', current_date)::date;
  v_month_end date := (v_month_start + interval '1 month')::date;
  v_fee_income numeric;
  v_admission_income numeric;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO v_fee_income
  FROM fee_records
  WHERE hostel_id = p_hostel_id
    AND status IN ('paid', 'partial')
    AND billing_month = v_month_start;

  SELECT coalesce(sum(amount), 0) INTO v_admission_income
  FROM admission_fees
  WHERE hostel_id = p_hostel_id
    AND payment_date >= v_month_start
    AND payment_date < v_month_end;

  SELECT json_build_object(
    'total_students', (
      SELECT count(*) FROM students WHERE hostel_id = p_hostel_id
    ),
    'active_students', (
      SELECT count(*) FROM students WHERE hostel_id = p_hostel_id AND status = 'active'
    ),
    'total_rooms', (
      SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id
    ),
    'occupied_rooms', (
      SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id AND status = 'full'
    ),
    'vacant_rooms', (
      SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id AND status = 'available'
    ),
    'maintenance_rooms', (
      SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id AND status = 'maintenance'
    ),
    'monthly_income', v_fee_income + v_admission_income,
    'monthly_fee_income', v_fee_income,
    'monthly_admission_income', v_admission_income,
    'monthly_expenses', (
      SELECT coalesce(sum(amount), 0) FROM expenses
      WHERE hostel_id = p_hostel_id
        AND expense_date >= v_month_start
        AND expense_date < v_month_end
    ),
    'pending_fees', (
      SELECT coalesce(sum(amount), 0) FROM fee_records
      WHERE hostel_id = p_hostel_id
        AND status = 'pending'
        AND billing_month = v_month_start
    ),
    'total_advance', (
      SELECT coalesce(sum(advance_amount), 0) FROM students
      WHERE hostel_id = p_hostel_id
        AND status = 'active'
        AND coalesce(advance_amount, 0) > 0
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_financial_chart(p_hostel_id uuid, p_months int DEFAULT 6)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      to_char(d.month_date, 'Mon') AS month,
      coalesce((
        SELECT sum(amount) FROM fee_records
        WHERE hostel_id = p_hostel_id
          AND status IN ('paid', 'partial')
          AND billing_month = d.month_date
      ), 0) + coalesce((
        SELECT sum(amount) FROM admission_fees
        WHERE hostel_id = p_hostel_id
          AND date_trunc('month', payment_date)::date = d.month_date
      ), 0) AS income,
      coalesce((
        SELECT sum(amount) FROM expenses
        WHERE hostel_id = p_hostel_id
          AND date_trunc('month', expense_date)::date = d.month_date
      ), 0) AS expenses
    FROM (
      SELECT generate_series(
        date_trunc('month', current_date - ((p_months - 1) || ' months')::interval),
        date_trunc('month', current_date),
        '1 month'::interval
      )::date AS month_date
    ) d
    ORDER BY d.month_date
  ) t;

  RETURN coalesce(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_financial_chart(uuid, int) TO authenticated;
