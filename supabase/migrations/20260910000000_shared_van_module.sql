-- Shared Van module (Royal Girls Hostel 1 + 2) — separate from hostel revenue/expenses

CREATE TABLE IF NOT EXISTS van_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  passenger_name text NOT NULL,
  billing_month date NOT NULL,
  payment_date date NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS van_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  billing_month date NOT NULL,
  expense_date date NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_van_payments_billing ON van_payments(hostel_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_van_expenses_billing ON van_expenses(hostel_id, billing_month);

ALTER TABLE van_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE van_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shared van select payments" ON van_payments;
CREATE POLICY "Shared van select payments"
  ON van_payments FOR SELECT
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

DROP POLICY IF EXISTS "Shared van insert payments" ON van_payments;
CREATE POLICY "Shared van insert payments"
  ON van_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    can_access_shared_ledger()
    AND hostel_id = get_shared_mess_hostel_id()
  );

DROP POLICY IF EXISTS "Shared van delete payments" ON van_payments;
CREATE POLICY "Shared van delete payments"
  ON van_payments FOR DELETE
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

DROP POLICY IF EXISTS "Shared van select expenses" ON van_expenses;
CREATE POLICY "Shared van select expenses"
  ON van_expenses FOR SELECT
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

DROP POLICY IF EXISTS "Shared van insert expenses" ON van_expenses;
CREATE POLICY "Shared van insert expenses"
  ON van_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    can_access_shared_ledger()
    AND hostel_id = get_shared_mess_hostel_id()
  );

DROP POLICY IF EXISTS "Shared van delete expenses" ON van_expenses;
CREATE POLICY "Shared van delete expenses"
  ON van_expenses FOR DELETE
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

CREATE OR REPLACE FUNCTION get_shared_van_month(p_billing_month date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_billing_month)::date;
  v_revenue numeric;
  v_expenses numeric;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO v_revenue
  FROM van_payments
  WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND billing_month = v_month_start;

  SELECT coalesce(sum(amount), 0) INTO v_expenses
  FROM van_expenses
  WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND billing_month = v_month_start;

  RETURN json_build_object(
    'payments', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.payment_date ASC, t.created_at ASC), '[]'::json)
      FROM (
        SELECT id, hostel_id, passenger_name, billing_month, payment_date, amount, notes, created_at
        FROM van_payments
        WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND billing_month = v_month_start
      ) t
    ),
    'expenses', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.expense_date ASC, t.created_at ASC), '[]'::json)
      FROM (
        SELECT id, hostel_id, billing_month, expense_date, amount, description, created_at
        FROM van_expenses
        WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND billing_month = v_month_start
      ) t
    ),
    'total_revenue', v_revenue,
    'total_expenses', v_expenses,
    'net_profit', v_revenue - v_expenses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_van_month(date) TO authenticated;

CREATE OR REPLACE FUNCTION add_shared_van_payment(
  p_billing_month date,
  p_passenger_name text,
  p_payment_date date,
  p_amount numeric,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hostel_id uuid;
  v_id uuid;
  v_month_start date := date_trunc('month', p_billing_month)::date;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF nullif(trim(p_passenger_name), '') IS NULL THEN
    RAISE EXCEPTION 'Passenger name is required';
  END IF;

  v_hostel_id := get_shared_mess_hostel_id();
  IF v_hostel_id IS NULL THEN
    RAISE EXCEPTION 'Shared van hostel not configured';
  END IF;

  INSERT INTO van_payments (hostel_id, passenger_name, billing_month, payment_date, amount, notes)
  VALUES (
    v_hostel_id,
    trim(p_passenger_name),
    v_month_start,
    p_payment_date,
    p_amount,
    nullif(trim(p_notes), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_shared_van_payment(date, text, date, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION delete_shared_van_payment(p_van_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row van_payments%ROWTYPE;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_row FROM van_payments WHERE id = p_van_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Van payment not found';
  END IF;

  IF v_row.hostel_id NOT IN (SELECT get_royal_girls_hostel_ids()) THEN
    RAISE EXCEPTION 'Not a shared van payment';
  END IF;

  DELETE FROM van_payments WHERE id = p_van_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_shared_van_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION add_shared_van_expense(
  p_billing_month date,
  p_expense_date date,
  p_amount numeric,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hostel_id uuid;
  v_id uuid;
  v_month_start date := date_trunc('month', p_billing_month)::date;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_hostel_id := get_shared_mess_hostel_id();
  IF v_hostel_id IS NULL THEN
    RAISE EXCEPTION 'Shared van hostel not configured';
  END IF;

  INSERT INTO van_expenses (hostel_id, billing_month, expense_date, amount, description)
  VALUES (
    v_hostel_id,
    v_month_start,
    p_expense_date,
    p_amount,
    nullif(trim(p_description), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_shared_van_expense(date, date, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION delete_shared_van_expense(p_van_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row van_expenses%ROWTYPE;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_row FROM van_expenses WHERE id = p_van_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Van expense not found';
  END IF;

  IF v_row.hostel_id NOT IN (SELECT get_royal_girls_hostel_ids()) THEN
    RAISE EXCEPTION 'Not a shared van expense';
  END IF;

  DELETE FROM van_expenses WHERE id = p_van_expense_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_shared_van_expense(uuid) TO authenticated;

-- Extend merged monthly report with separate Van section (not included in hostel profit)
CREATE OR REPLACE FUNCTION get_merged_profit_monthly_report(p_billing_month date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_billing_month)::date;
  v_month_end date := (date_trunc('month', p_billing_month) + interval '1 month' - interval '1 day')::date;
  v_van_revenue numeric;
  v_van_expenses numeric;
  result json;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO v_van_revenue
  FROM van_payments
  WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND billing_month = v_month_start;

  SELECT coalesce(sum(amount), 0) INTO v_van_expenses
  FROM van_expenses
  WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
    AND billing_month = v_month_start;

  SELECT json_build_object(
    'billing_month', v_month_start,
    'currency', 'PKR',
    'hostel_summaries', (
      SELECT coalesce(json_agg(row_to_json(s) ORDER BY s.hostel_name), '[]'::json)
      FROM (
        SELECT
          h.id AS hostel_id,
          h.name AS hostel_name,
          coalesce((
            SELECT sum(fr.amount)
            FROM fee_records fr
            WHERE fr.hostel_id = h.id
              AND fr.fee_type = 'rent'
              AND fr.status IN ('paid', 'partial')
              AND fr.billing_month = v_month_start
          ), 0) AS rent_collected,
          coalesce((
            SELECT sum(fr.amount)
            FROM fee_records fr
            WHERE fr.hostel_id = h.id
              AND fr.fee_type = 'mess'
              AND fr.status IN ('paid', 'partial')
              AND fr.billing_month = v_month_start
          ), 0) AS mess_collected,
          coalesce((
            SELECT sum(e.amount)
            FROM expenses e
            WHERE e.hostel_id = h.id
              AND e.employee_id IS NOT NULL
              AND e.expense_date BETWEEN v_month_start AND v_month_end
          ), 0) AS staff_expenses,
          coalesce((
            SELECT sum(me.amount)
            FROM mess_expenses me
            WHERE me.hostel_id = h.id
              AND me.billing_month = v_month_start
          ), 0) AS mess_operating_expenses,
          coalesce((
            SELECT sum(e.amount)
            FROM expenses e
            LEFT JOIN expense_categories ec ON ec.id = e.category_id
            WHERE e.hostel_id = h.id
              AND e.expense_date BETWEEN v_month_start AND v_month_end
              AND e.employee_id IS NULL
              AND coalesce(is_ledger_vendor(e.vendor), false) = false
              AND e.title NOT LIKE 'Payment — %'
              AND coalesce(ec.name, '') NOT IN ('Mess - Daily', 'Mess - Initial')
              AND lower(coalesce(e.vendor, '')) <> 'mess'
              AND coalesce(e.title, '') NOT ILIKE '%mess expense%'
          ), 0) AS other_expenses,
          coalesce((
            SELECT sum(st.advance_amount)
            FROM students st
            WHERE st.hostel_id = h.id
              AND st.status = 'active'
              AND coalesce(st.advance_amount, 0) > 0
          ), 0) AS total_advance
        FROM hostels h
        WHERE h.id IN (SELECT get_royal_girls_hostel_ids())
      ) s
    ),
    'student_billing', (
      SELECT coalesce(json_agg(row_to_json(sb) ORDER BY sb.hostel_name, sb.student_name), '[]'::json)
      FROM (
        SELECT
          h.name AS hostel_name,
          coalesce(st.full_name, st.student_code) AS student_name,
          st.student_code,
          coalesce(st.advance_amount, 0)::numeric AS advance_amount,
          coalesce(st.monthly_rent, 0)::numeric AS rent_amount,
          (
            CASE
              WHEN NOT (
                coalesce(st.has_mess, false)
                OR coalesce(st.has_breakfast, false)
                OR coalesce(st.has_lunch, false)
                OR coalesce(st.has_dinner, false)
              ) THEN 0::numeric
              WHEN coalesce(st.has_mess, false) AND coalesce(st.mess_fee, 0) > 0 THEN st.mess_fee
              ELSE
                coalesce(st.breakfast_fee, 0) * CASE WHEN coalesce(st.has_breakfast, false) THEN 1 ELSE 0 END
                + coalesce(st.lunch_fee, 0) * CASE WHEN coalesce(st.has_lunch, false) THEN 1 ELSE 0 END
                + coalesce(st.dinner_fee, 0) * CASE WHEN coalesce(st.has_dinner, false) THEN 1 ELSE 0 END
            END
          )::numeric AS mess_amount,
          rent_fr.status AS rent_status,
          mess_fr.status AS mess_status,
          coalesce(rent_fr.payment_date, mess_fr.payment_date) AS payment_date,
          coalesce(rent_fr.invoice_code, mess_fr.invoice_code) AS invoice_code
        FROM students st
        JOIN hostels h ON h.id = st.hostel_id
        LEFT JOIN fee_records rent_fr
          ON rent_fr.student_id = st.id
          AND rent_fr.fee_type = 'rent'
          AND rent_fr.billing_month = v_month_start
        LEFT JOIN fee_records mess_fr
          ON mess_fr.student_id = st.id
          AND mess_fr.fee_type = 'mess'
          AND mess_fr.billing_month = v_month_start
        WHERE st.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND st.status = 'active'
      ) sb
    ),
    'staff_payments', (
      SELECT coalesce(json_agg(row_to_json(sp) ORDER BY sp.hostel_name, sp.employee_name), '[]'::json)
      FROM (
        SELECT
          h.name AS hostel_name,
          emp.full_name AS employee_name,
          emp.role,
          e.amount,
          e.expense_date AS payment_date,
          e.title
        FROM expenses e
        JOIN hostels h ON h.id = e.hostel_id
        JOIN employees emp ON emp.id = e.employee_id
        WHERE e.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND e.expense_date BETWEEN v_month_start AND v_month_end
      ) sp
    ),
    'expenses', (
      SELECT coalesce(json_agg(row_to_json(ex) ORDER BY ex.hostel_name, ex.expense_date DESC), '[]'::json)
      FROM (
        SELECT
          h.name AS hostel_name,
          e.title,
          coalesce(ec.name, 'General') AS category,
          e.vendor,
          e.amount,
          e.expense_date,
          e.status
        FROM expenses e
        JOIN hostels h ON h.id = e.hostel_id
        LEFT JOIN expense_categories ec ON ec.id = e.category_id
        WHERE e.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND e.expense_date BETWEEN v_month_start AND v_month_end
          AND e.employee_id IS NULL
          AND coalesce(is_ledger_vendor(e.vendor), false) = false
          AND e.title NOT LIKE 'Payment — %'
          AND coalesce(ec.name, '') NOT IN ('Mess - Daily', 'Mess - Initial')
          AND lower(coalesce(e.vendor, '')) <> 'mess'
          AND coalesce(e.title, '') NOT ILIKE '%mess expense%'
      ) ex
    ),
    'mess_expenses', (
      SELECT coalesce(json_agg(row_to_json(mx) ORDER BY mx.hostel_name, mx.expense_date), '[]'::json)
      FROM (
        SELECT
          h.name AS hostel_name,
          me.description,
          me.amount,
          me.expense_date,
          me.expense_type
        FROM mess_expenses me
        JOIN hostels h ON h.id = me.hostel_id
        WHERE me.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND me.billing_month = v_month_start
      ) mx
    ),
    'shared_ledger', (
      SELECT coalesce(json_agg(row_to_json(l) ORDER BY l.expense_date DESC), '[]'::json)
      FROM (
        SELECT
          h.name AS hostel_name,
          coalesce(
            nullif(e.vendor, ''),
            nullif(regexp_replace(e.title, '^Payment — ', ''), e.title)
          ) AS vendor,
          e.amount,
          e.expense_date,
          e.description
        FROM expenses e
        JOIN hostels h ON h.id = e.hostel_id
        WHERE e.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND e.expense_date BETWEEN v_month_start AND v_month_end
          AND (is_ledger_vendor(e.vendor) OR e.title LIKE 'Payment — %')
      ) l
    ),
    'van', json_build_object(
      'payments', (
        SELECT coalesce(json_agg(row_to_json(vp) ORDER BY vp.payment_date ASC), '[]'::json)
        FROM (
          SELECT passenger_name, payment_date, amount, notes
          FROM van_payments
          WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
            AND billing_month = v_month_start
        ) vp
      ),
      'expenses', (
        SELECT coalesce(json_agg(row_to_json(ve) ORDER BY ve.expense_date ASC), '[]'::json)
        FROM (
          SELECT expense_date, amount, description
          FROM van_expenses
          WHERE hostel_id IN (SELECT get_royal_girls_hostel_ids())
            AND billing_month = v_month_start
        ) ve
      ),
      'total_revenue', v_van_revenue,
      'total_expenses', v_van_expenses,
      'net_profit', v_van_revenue - v_van_expenses
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_merged_profit_monthly_report(date) TO authenticated;
