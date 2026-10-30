-- Automatic monthly closing: snapshots, income attribution (advance vs arrears), locks, scheduler hooks.
-- Preserves all historical rows; never deletes financial data.

-- ---------------------------------------------------------------------------
-- Closed month check + income month (advance → fee month; arrears after close → cash month)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_hostel_month_closed(p_hostel_id uuid, p_month date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM month_closures mc
    WHERE mc.hostel_id = p_hostel_id
      AND mc.billing_month = date_trunc('month', p_month)::date
  );
$$;

CREATE OR REPLACE FUNCTION fee_income_month(
  p_hostel_id uuid,
  p_billing_month date,
  p_payment_date date
)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_pay_month date;
  v_bill date := date_trunc('month', p_billing_month)::date;
BEGIN
  IF p_payment_date IS NULL THEN
    RETURN NULL;
  END IF;
  v_pay_month := date_trunc('month', p_payment_date)::date;

  IF v_bill > v_pay_month THEN
    RETURN v_bill;
  END IF;

  IF is_hostel_month_closed(p_hostel_id, v_bill)
     AND v_pay_month > v_bill THEN
    RETURN v_pay_month;
  END IF;

  RETURN v_bill;
END;
$$;

GRANT EXECUTE ON FUNCTION is_hostel_month_closed(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION fee_income_month(uuid, date, date) TO authenticated;

ALTER TABLE fee_records
  ADD COLUMN IF NOT EXISTS income_month date;

CREATE OR REPLACE FUNCTION sync_fee_record_income_month()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'partial') AND NEW.payment_date IS NOT NULL THEN
    NEW.income_month := fee_income_month(NEW.hostel_id, NEW.billing_month, NEW.payment_date);
  ELSE
    NEW.income_month := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_records_income_month ON fee_records;
CREATE TRIGGER trg_fee_records_income_month
  BEFORE INSERT OR UPDATE ON fee_records
  FOR EACH ROW
  EXECUTE FUNCTION sync_fee_record_income_month();

UPDATE fee_records fr
SET income_month = fee_income_month(fr.hostel_id, fr.billing_month, fr.payment_date)
WHERE fr.status IN ('paid', 'partial')
  AND fr.payment_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Closed-month guards (backend enforcement)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_month_open_for_date(p_hostel_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF is_hostel_month_closed(p_hostel_id, date_trunc('month', p_date)::date) THEN
    RAISE EXCEPTION 'This month is closed and cannot be modified.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_closed_month_fee_records()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_closed boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF is_hostel_month_closed(OLD.hostel_id, OLD.billing_month) THEN
      RAISE EXCEPTION 'Cannot delete fee records for a closed month.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF is_hostel_month_closed(NEW.hostel_id, NEW.billing_month) THEN
      RAISE EXCEPTION 'Cannot add fee records for a closed month.';
    END IF;
    RETURN NEW;
  END IF;

  v_closed := is_hostel_month_closed(OLD.hostel_id, OLD.billing_month);
  IF NOT v_closed THEN
    RETURN NEW;
  END IF;

  IF NEW.billing_month IS DISTINCT FROM OLD.billing_month
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.fee_type IS DISTINCT FROM OLD.fee_type
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.hostel_id IS DISTINCT FROM OLD.hostel_id
     OR NEW.invoice_code IS DISTINCT FROM OLD.invoice_code THEN
    RAISE EXCEPTION 'Closed month fee records can only be updated for payment collection (status, dates, method, notes).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_records_closed_month ON fee_records;
CREATE TRIGGER trg_fee_records_closed_month
  BEFORE UPDATE OR DELETE OR INSERT ON fee_records
  FOR EACH ROW
  EXECUTE FUNCTION enforce_closed_month_fee_records();

CREATE OR REPLACE FUNCTION enforce_closed_month_by_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hostel uuid;
  v_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_hostel := OLD.hostel_id;
    v_date := OLD.expense_date;
  ELSE
    v_hostel := NEW.hostel_id;
    v_date := NEW.expense_date;
  END IF;
  PERFORM assert_month_open_for_date(v_hostel, v_date);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- expenses (general + ledger)
DROP TRIGGER IF EXISTS trg_expenses_closed_month ON expenses;
CREATE TRIGGER trg_expenses_closed_month
  BEFORE INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_closed_month_by_date();

CREATE OR REPLACE FUNCTION enforce_closed_month_billing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hostel uuid;
  v_month date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_hostel := OLD.hostel_id;
    v_month := OLD.billing_month;
  ELSE
    v_hostel := NEW.hostel_id;
    v_month := NEW.billing_month;
  END IF;
  IF is_hostel_month_closed(v_hostel, v_month) THEN
    RAISE EXCEPTION 'This billing month is closed and cannot be modified.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mess_expenses_closed ON mess_expenses;
CREATE TRIGGER trg_mess_expenses_closed
  BEFORE INSERT OR UPDATE OR DELETE ON mess_expenses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_closed_month_billing();

DROP TRIGGER IF EXISTS trg_van_payments_closed ON van_payments;
CREATE TRIGGER trg_van_payments_closed
  BEFORE INSERT OR UPDATE OR DELETE ON van_payments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_closed_month_billing();

DROP TRIGGER IF EXISTS trg_van_expenses_closed ON van_expenses;
CREATE TRIGGER trg_van_expenses_closed
  BEFORE INSERT OR UPDATE OR DELETE ON van_expenses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_closed_month_billing();

DROP TRIGGER IF EXISTS trg_outside_mess_closed ON outside_mess_payments;
CREATE TRIGGER trg_outside_mess_closed
  BEFORE INSERT OR UPDATE OR DELETE ON outside_mess_payments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_closed_month_billing();

CREATE OR REPLACE FUNCTION enforce_closed_admission_month()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hostel uuid;
  v_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_hostel := OLD.hostel_id;
    v_date := OLD.payment_date;
  ELSE
    v_hostel := NEW.hostel_id;
    v_date := NEW.payment_date;
  END IF;
  PERFORM assert_month_open_for_date(v_hostel, v_date);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admission_fees_closed ON admission_fees;
CREATE TRIGGER trg_admission_fees_closed
  BEFORE INSERT OR UPDATE OR DELETE ON admission_fees
  FOR EACH ROW
  EXECUTE FUNCTION enforce_closed_admission_month();

-- ---------------------------------------------------------------------------
-- Rich snapshot at close (merged profit fields + arrears/advance breakdown)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION build_hostel_month_snapshot(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date := date_trunc('month', p_billing_month)::date;
  v_end date := (v_start + interval '1 month' - interval '1 day')::date;
  v_fees numeric;
  v_admission numeric;
  v_mess_in numeric;
  v_mess_out numeric;
  v_van_in numeric;
  v_van_out numeric;
  v_general numeric;
  v_ledger numeric;
  v_pending numeric;
  v_advance numeric;
  v_prior_collections numeric;
  v_outside_mess numeric;
BEGIN
  SELECT coalesce(sum(amount), 0) INTO v_fees
  FROM fee_records
  WHERE hostel_id = p_hostel_id
    AND status IN ('paid', 'partial')
    AND coalesce(income_month, fee_income_month(hostel_id, billing_month, payment_date)) = v_start;

  SELECT coalesce(sum(amount), 0) INTO v_admission
  FROM admission_fees
  WHERE hostel_id = p_hostel_id
    AND payment_date BETWEEN v_start AND v_end;

  SELECT coalesce(sum(amount), 0) INTO v_mess_in
  FROM fee_records
  WHERE hostel_id = p_hostel_id
    AND fee_type = 'mess'
    AND status IN ('paid', 'partial')
    AND billing_month = v_start;

  SELECT coalesce(sum(amount), 0) INTO v_outside_mess
  FROM outside_mess_payments
  WHERE hostel_id = p_hostel_id
    AND billing_month = v_start;

  SELECT coalesce(sum(amount), 0) INTO v_mess_out
  FROM mess_expenses
  WHERE hostel_id = p_hostel_id
    AND billing_month = v_start;

  SELECT coalesce(sum(amount), 0) INTO v_van_in
  FROM van_payments
  WHERE hostel_id = p_hostel_id
    AND billing_month = v_start;

  SELECT coalesce(sum(amount), 0) INTO v_van_out
  FROM van_expenses
  WHERE hostel_id = p_hostel_id
    AND billing_month = v_start;

  SELECT coalesce(sum(amount), 0) INTO v_general
  FROM expenses e
  WHERE e.hostel_id = p_hostel_id
    AND e.expense_date BETWEEN v_start AND v_end
    AND e.employee_id IS NULL
    AND coalesce(is_ledger_vendor(e.vendor), false) = false
    AND e.title NOT LIKE 'Payment — %';

  SELECT coalesce(sum(amount), 0) INTO v_ledger
  FROM expenses e
  WHERE e.hostel_id = p_hostel_id
    AND e.expense_date BETWEEN v_start AND v_end
    AND (is_ledger_vendor(e.vendor) OR e.title LIKE 'Payment — %');

  SELECT coalesce(sum(amount), 0) INTO v_pending
  FROM fee_records
  WHERE hostel_id = p_hostel_id
    AND status IN ('pending', 'partial')
    AND billing_month = v_start;

  SELECT coalesce(sum(advance_amount), 0) INTO v_advance
  FROM students
  WHERE hostel_id = p_hostel_id
    AND status = 'active'
    AND coalesce(advance_amount, 0) > 0;

  SELECT coalesce(sum(amount), 0) INTO v_prior_collections
  FROM fee_records
  WHERE hostel_id = p_hostel_id
    AND status IN ('paid', 'partial')
    AND billing_month < v_start
    AND income_month = v_start;

  RETURN jsonb_build_object(
    'billing_month', v_start,
    'total_combined_income',
      v_fees + v_admission + v_van_in + v_outside_mess,
    'total_combined_expenses',
      v_mess_out + v_general + v_ledger + v_van_out,
    'net_profit',
      (v_fees + v_admission + v_van_in + v_outside_mess)
      - (v_mess_out + v_general + v_ledger + v_van_out),
    'fees_and_invoice_income', v_fees,
    'admission_fee_income', v_admission,
    'mess_income', v_mess_in + v_outside_mess,
    'mess_expenses', v_mess_out,
    'van_income', v_van_in,
    'van_expenses', v_van_out,
    'general_expenses', v_general,
    'ledger_payments', v_ledger,
    'outstanding_student_fees', v_pending,
    'advance_fee_payments', v_advance,
    'previous_month_fee_collections', v_prior_collections,
    'monthly_income', v_fees,
    'monthly_expenses', v_mess_out + v_general + v_ledger + v_van_out,
    'pending_fees', v_pending
  );
END;
$$;

-- System close (cron / service role) — no has_hostel_access check
CREATE OR REPLACE FUNCTION close_hostel_month_system(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date := date_trunc('month', p_billing_month)::date;
BEGIN
  IF EXISTS (
    SELECT 1 FROM month_closures
    WHERE hostel_id = p_hostel_id AND billing_month = v_month
  ) THEN
    RETURN;
  END IF;

  INSERT INTO month_closures (hostel_id, billing_month, closed_at, closed_by, snapshot)
  VALUES (
    p_hostel_id,
    v_month,
    now(),
    NULL,
    build_hostel_month_snapshot(p_hostel_id, v_month)
  );
END;
$$;

CREATE OR REPLACE FUNCTION auto_close_hostel_months_system(p_hostel_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_current date;
  v_last date;
  v_month date;
  v_closed_months jsonb := '[]'::jsonb;
  v_did_close boolean := false;
  v_fees_created integer;
BEGIN
  SELECT coalesce(nullif(trim(timezone), ''), 'Asia/Karachi')
  INTO v_tz
  FROM hostels
  WHERE id = p_hostel_id;

  v_current := date_trunc('month', (now() AT TIME ZONE v_tz))::date;

  SELECT last_closed_month INTO v_last
  FROM hostels
  WHERE id = p_hostel_id
  FOR UPDATE;

  IF v_last IS NULL THEN
    v_last := (v_current - interval '1 month')::date;
  END IF;

  v_month := (v_last + interval '1 month')::date;
  WHILE v_month < v_current LOOP
    PERFORM close_hostel_month_system(p_hostel_id, v_month);
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

CREATE OR REPLACE FUNCTION auto_close_all_hostels_cron()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hostel record;
  v_results jsonb := '[]'::jsonb;
  v_one json;
BEGIN
  FOR v_hostel IN SELECT id FROM hostels LOOP
    v_one := auto_close_hostel_months_system(v_hostel.id);
    v_results := v_results || jsonb_build_object('hostel_id', v_hostel.id, 'result', v_one);
  END LOOP;
  RETURN json_build_object('ran_at', now(), 'hostels', v_results);
END;
$$;

REVOKE ALL ON FUNCTION close_hostel_month_system(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION auto_close_hostel_months_system(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION auto_close_all_hostels_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auto_close_all_hostels_cron() TO service_role;

-- Authenticated path delegates to system logic after access check
CREATE OR REPLACE FUNCTION auto_close_hostel_months(p_hostel_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN auto_close_hostel_months_system(p_hostel_id);
END;
$$;

CREATE OR REPLACE FUNCTION close_hostel_month(p_hostel_id uuid, p_billing_month date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  PERFORM close_hostel_month_system(p_hostel_id, p_billing_month);
END;
$$;

CREATE OR REPLACE FUNCTION get_month_closure_snapshot(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snap jsonb;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT snapshot INTO v_snap
  FROM month_closures
  WHERE hostel_id = p_hostel_id
    AND billing_month = date_trunc('month', p_billing_month)::date;

  IF v_snap IS NULL THEN
    RAISE EXCEPTION 'No closed report for this month';
  END IF;

  RETURN v_snap;
END;
$$;

GRANT EXECUTE ON FUNCTION get_month_closure_snapshot(uuid, date) TO authenticated;

-- Dashboard: current calendar month cash fee income (includes prior-month collections)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hostel_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_tz text;
  v_month_start date;
  v_month_end date;
BEGIN
  IF NOT has_hostel_access(p_hostel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT coalesce(nullif(trim(timezone), ''), 'Asia/Karachi')
  INTO v_tz
  FROM hostels
  WHERE id = p_hostel_id;

  v_month_start := date_trunc('month', (now() AT TIME ZONE v_tz))::date;
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;

  SELECT json_build_object(
    'total_students', (SELECT count(*) FROM students WHERE hostel_id = p_hostel_id),
    'active_students', (SELECT count(*) FROM students WHERE hostel_id = p_hostel_id AND status = 'active'),
    'total_rooms', (SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id),
    'occupied_rooms', (SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id AND status = 'full'),
    'vacant_rooms', (SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id AND status = 'available'),
    'maintenance_rooms', (SELECT count(*) FROM rooms WHERE hostel_id = p_hostel_id AND status = 'maintenance'),
    'monthly_income', (
      SELECT coalesce(sum(amount), 0) FROM fee_records
      WHERE hostel_id = p_hostel_id
        AND status IN ('paid', 'partial')
        AND income_month = v_month_start
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

GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;

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
  IF auth.uid() IS NOT NULL AND NOT has_hostel_access(p_hostel_id) THEN
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
