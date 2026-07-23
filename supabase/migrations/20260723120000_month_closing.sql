-- Month closing: auto-close previous month, open fresh month with pending fees.
-- Preserves students, rooms, budget, ledger, police verification, and all history.

ALTER TABLE hostels
  ADD COLUMN IF NOT EXISTS last_closed_month date;

CREATE TABLE IF NOT EXISTS month_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  billing_month date NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_month_closures_hostel ON month_closures(hostel_id);
CREATE INDEX IF NOT EXISTS idx_month_closures_month ON month_closures(billing_month DESC);

ALTER TABLE month_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hostel members read month_closures" ON month_closures;
CREATE POLICY "Hostel members read month_closures"
  ON month_closures FOR SELECT
  TO authenticated
  USING (has_hostel_access(hostel_id));

DROP POLICY IF EXISTS "Hostel members insert month_closures" ON month_closures;
CREATE POLICY "Hostel members insert month_closures"
  ON month_closures FOR INSERT
  TO authenticated
  WITH CHECK (has_hostel_access(hostel_id));

-- Mess fee amount for a student row (matches app logic in messUtils.ts)
CREATE OR REPLACE FUNCTION calc_student_mess_fee(
  p_has_mess boolean,
  p_mess_fee numeric,
  p_has_breakfast boolean,
  p_breakfast_fee numeric,
  p_has_lunch boolean,
  p_lunch_fee numeric,
  p_has_dinner boolean,
  p_dinner_fee numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_has_mess, false) AND COALESCE(p_mess_fee, 0) > 0 THEN p_mess_fee
    ELSE
      COALESCE(CASE WHEN COALESCE(p_has_breakfast, false) THEN p_breakfast_fee ELSE 0 END, 0)
      + COALESCE(CASE WHEN COALESCE(p_has_lunch, false) THEN p_lunch_fee ELSE 0 END, 0)
      + COALESCE(CASE WHEN COALESCE(p_has_dinner, false) THEN p_dinner_fee ELSE 0 END, 0)
  END;
$$;

CREATE OR REPLACE FUNCTION student_has_mess(
  p_has_mess boolean,
  p_has_breakfast boolean,
  p_has_lunch boolean,
  p_has_dinner boolean
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_has_mess, false)
    OR COALESCE(p_has_breakfast, false)
    OR COALESCE(p_has_lunch, false)
    OR COALESCE(p_has_dinner, false);
$$;

CREATE OR REPLACE FUNCTION generate_invoice_code(
  p_student_code text,
  p_billing_month date
)
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'INV-'
    || to_char(p_billing_month, 'YYYYMM')
    || '-'
    || p_student_code
    || '-'
    || (1000 + floor(random() * 9000)::int)::text;
$$;

-- Snapshot and mark one month as closed (does not delete any data).
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
END;
$$;

-- Create pending rent + mess fee records for active students in a billing month.
CREATE OR REPLACE FUNCTION generate_month_pending_fees(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
  v_mess_amount numeric;
  v_created integer := 0;
  v_invoice text;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_student IN
    SELECT *
    FROM students
    WHERE hostel_id = p_hostel_id
      AND status = 'active'
  LOOP
    IF COALESCE(v_student.monthly_rent, 0) > 0 THEN
      INSERT INTO fee_records (
        hostel_id, student_id, billing_month, amount, fee_type,
        invoice_code, status, payment_date
      )
      SELECT
        p_hostel_id,
        v_student.id,
        p_billing_month,
        v_student.monthly_rent,
        'rent'::fee_type,
        generate_invoice_code(v_student.student_code, p_billing_month),
        'pending'::fee_status,
        NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM fee_records fr
        WHERE fr.student_id = v_student.id
          AND fr.billing_month = p_billing_month
          AND fr.fee_type = 'rent'
      );

      IF FOUND THEN
        v_created := v_created + 1;
      END IF;
    END IF;

    IF student_has_mess(
      v_student.has_mess,
      v_student.has_breakfast,
      v_student.has_lunch,
      v_student.has_dinner
    ) THEN
      v_mess_amount := calc_student_mess_fee(
        v_student.has_mess,
        v_student.mess_fee,
        v_student.has_breakfast,
        v_student.breakfast_fee,
        v_student.has_lunch,
        v_student.lunch_fee,
        v_student.has_dinner,
        v_student.dinner_fee
      );

      IF v_mess_amount > 0 THEN
        v_invoice := generate_invoice_code(v_student.student_code, p_billing_month);

        INSERT INTO fee_records (
          hostel_id, student_id, billing_month, amount, fee_type,
          invoice_code, status, payment_date
        )
        SELECT
          p_hostel_id,
          v_student.id,
          p_billing_month,
          v_mess_amount,
          'mess'::fee_type,
          v_invoice,
          'pending'::fee_status,
          NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM fee_records fr
          WHERE fr.student_id = v_student.id
            AND fr.billing_month = p_billing_month
            AND fr.fee_type = 'mess'
        );

        IF FOUND THEN
          v_created := v_created + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN v_created;
END;
$$;

-- Auto-close previous month(s) and open the current month when a new month starts.
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

  RETURN json_build_object(
    'current_month', v_current,
    'closed_months', v_closed_months,
    'did_close', v_did_close,
    'fees_created', v_fees_created
  );
END;
$$;

-- Dashboard: scope pending fees to current billing month only.
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hostel_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_month_start date := date_trunc('month', current_date)::date;
  v_month_end date := (v_month_start + interval '1 month' - interval '1 day')::date;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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
    'monthly_income', (
      SELECT coalesce(sum(amount), 0) FROM fee_records
      WHERE hostel_id = p_hostel_id
        AND status = 'paid'
        AND billing_month = v_month_start
    ),
    'monthly_expenses', (
      SELECT coalesce(sum(amount), 0) FROM expenses
      WHERE hostel_id = p_hostel_id
        AND expense_date >= v_month_start
        AND expense_date <= v_month_end
    ),
    'pending_fees', (
      SELECT coalesce(sum(amount), 0) FROM fee_records
      WHERE hostel_id = p_hostel_id
        AND status IN ('pending', 'partial')
        AND billing_month = v_month_start
    )
  ) INTO result;

  RETURN result;
END;
$$;
