-- Shared mess expenses for Royal Girls Hostel 1 + 2 (same data for both logins)

CREATE OR REPLACE FUNCTION get_shared_mess_hostel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM hostels
  WHERE slug = 'royal-girls-hostel-1'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_shared_mess_hostel_id() TO authenticated;

CREATE OR REPLACE FUNCTION get_shared_mess_expenses(p_billing_month date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_billing_month)::date;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.expense_date ASC, t.created_at ASC), '[]'::json)
    FROM (
      SELECT
        me.id,
        me.hostel_id,
        me.expense_type,
        me.billing_month,
        me.expense_date,
        me.amount,
        me.description,
        me.expense_id,
        me.created_at,
        me.updated_at
      FROM mess_expenses me
      WHERE me.hostel_id IN (SELECT get_royal_girls_hostel_ids())
        AND me.billing_month = v_month_start
        AND me.expense_type = 'daily'
    ) t
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_mess_expenses(date) TO authenticated;

CREATE OR REPLACE FUNCTION delete_shared_mess_expense(p_mess_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row mess_expenses%ROWTYPE;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_row FROM mess_expenses WHERE id = p_mess_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mess expense not found';
  END IF;

  IF v_row.hostel_id NOT IN (SELECT get_royal_girls_hostel_ids()) THEN
    RAISE EXCEPTION 'Not a shared mess expense';
  END IF;

  IF v_row.expense_id IS NOT NULL THEN
    DELETE FROM expenses WHERE id = v_row.expense_id;
  END IF;

  DELETE FROM mess_expenses WHERE id = p_mess_expense_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_shared_mess_expense(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION add_shared_mess_expense(
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
  v_category_id uuid;
  v_expense_id uuid;
  v_mess_id uuid;
  v_month_start date := date_trunc('month', p_billing_month)::date;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_hostel_id := get_shared_mess_hostel_id();
  IF v_hostel_id IS NULL THEN
    RAISE EXCEPTION 'Shared mess hostel not configured';
  END IF;

  SELECT id INTO v_category_id
  FROM expense_categories
  WHERE hostel_id = v_hostel_id
    AND name = 'Mess - Daily'
  LIMIT 1;

  IF v_category_id IS NULL THEN
    INSERT INTO expense_categories (hostel_id, name)
    VALUES (v_hostel_id, 'Mess - Daily')
    RETURNING id INTO v_category_id;
  END IF;

  INSERT INTO expenses (
    hostel_id,
    category_id,
    title,
    description,
    vendor,
    amount,
    expense_date,
    status
  )
  VALUES (
    v_hostel_id,
    v_category_id,
    'Daily Mess Expense',
    nullif(trim(p_description), ''),
    'Mess',
    p_amount,
    p_expense_date,
    'paid'
  )
  RETURNING id INTO v_expense_id;

  INSERT INTO mess_expenses (
    hostel_id,
    expense_type,
    billing_month,
    expense_date,
    amount,
    description,
    expense_id
  )
  VALUES (
    v_hostel_id,
    'daily',
    v_month_start,
    p_expense_date,
    p_amount,
    nullif(trim(p_description), ''),
    v_expense_id
  )
  RETURNING id INTO v_mess_id;

  RETURN v_mess_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_shared_mess_expense(date, date, numeric, text) TO authenticated;

DROP POLICY IF EXISTS "Shared mess select mess_expenses" ON mess_expenses;
CREATE POLICY "Shared mess select mess_expenses"
  ON mess_expenses FOR SELECT
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

DROP POLICY IF EXISTS "Shared mess delete mess_expenses" ON mess_expenses;
CREATE POLICY "Shared mess delete mess_expenses"
  ON mess_expenses FOR DELETE
  TO authenticated
  USING (
    can_access_shared_ledger()
    AND hostel_id IN (SELECT get_royal_girls_hostel_ids())
  );

DROP POLICY IF EXISTS "Shared mess insert mess_expenses" ON mess_expenses;
CREATE POLICY "Shared mess insert mess_expenses"
  ON mess_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    can_access_shared_ledger()
    AND hostel_id = get_shared_mess_hostel_id()
  );
