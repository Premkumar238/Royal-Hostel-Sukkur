-- Outside mess payments (non-student) + mess income includes them by fee month (billing_month)

CREATE TABLE IF NOT EXISTS outside_mess_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  payment_date date NOT NULL DEFAULT (current_date),
  billing_month date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outside_mess_payments_hostel_idx ON outside_mess_payments(hostel_id);
CREATE INDEX IF NOT EXISTS outside_mess_payments_billing_month_idx ON outside_mess_payments(billing_month);

ALTER TABLE outside_mess_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outside_mess_select" ON outside_mess_payments;
CREATE POLICY "outside_mess_select"
  ON outside_mess_payments FOR SELECT
  USING (has_hostel_access(hostel_id));

DROP POLICY IF EXISTS "outside_mess_insert" ON outside_mess_payments;
CREATE POLICY "outside_mess_insert"
  ON outside_mess_payments FOR INSERT
  WITH CHECK (has_hostel_access(hostel_id));

DROP POLICY IF EXISTS "outside_mess_delete" ON outside_mess_payments;
CREATE POLICY "outside_mess_delete"
  ON outside_mess_payments FOR DELETE
  USING (has_hostel_access(hostel_id));

CREATE OR REPLACE FUNCTION get_shared_mess_month_summary(p_billing_month date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_billing_month)::date;
  v_student_mess numeric;
  v_outside_mess numeric;
  v_income numeric;
  v_expenses numeric;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT coalesce(sum(fr.amount), 0) INTO v_student_mess
  FROM fee_records fr
  WHERE fr.hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND fr.fee_type = 'mess'
    AND fr.status IN ('paid', 'partial')
    AND fr.billing_month = v_month_start;

  SELECT coalesce(sum(omp.amount), 0) INTO v_outside_mess
  FROM outside_mess_payments omp
  WHERE omp.hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND omp.billing_month = v_month_start;

  v_income := v_student_mess + v_outside_mess;

  SELECT coalesce(sum(me.amount), 0) INTO v_expenses
  FROM mess_expenses me
  WHERE me.hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND me.billing_month = v_month_start
    AND me.expense_type = 'daily';

  RETURN json_build_object(
    'total_income', v_income,
    'student_mess_income', v_student_mess,
    'outside_mess_income', v_outside_mess,
    'total_expenses', v_expenses,
    'mess_profit', v_income - v_expenses,
    'billing_month', v_month_start
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_mess_month_summary(date) TO authenticated;
