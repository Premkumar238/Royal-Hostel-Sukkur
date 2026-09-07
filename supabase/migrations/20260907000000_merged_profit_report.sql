-- Merged profit dashboard & monthly report for Royal Girls Hostel 1 + 2
-- Run in Supabase SQL Editor after shared ledger migrations (20260723130000, 20260723140000)

CREATE OR REPLACE FUNCTION get_merged_financial_chart(p_months int DEFAULT 12)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.sort_key), '[]'::json)
  INTO result
  FROM (
    SELECT
      to_char(d.month_date, 'Mon YYYY') AS month,
      d.month_date AS sort_key,
      coalesce((
        SELECT sum(fr.amount)
        FROM fee_records fr
        WHERE fr.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND fr.status IN ('paid', 'partial')
          AND fr.billing_month = d.month_date
      ), 0) AS income,
      coalesce((
        SELECT sum(e.amount)
        FROM expenses e
        WHERE e.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND date_trunc('month', e.expense_date)::date = d.month_date
      ), 0) AS expenses
    FROM (
      SELECT generate_series(
        date_trunc('month', current_date - ((p_months - 1) || ' months')::interval),
        date_trunc('month', current_date),
        '1 month'::interval
      )::date AS month_date
    ) d
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_merged_financial_chart(int) TO authenticated;

CREATE OR REPLACE FUNCTION get_merged_profit_monthly_report(p_billing_month date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_billing_month)::date;
  v_month_end date := (date_trunc('month', p_billing_month) + interval '1 month' - interval '1 day')::date;
  result json;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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
            WHERE e.hostel_id = h.id
              AND e.expense_date BETWEEN v_month_start AND v_month_end
              AND e.employee_id IS NULL
              AND NOT is_ledger_vendor(e.vendor)
              AND e.title NOT LIKE 'Payment — %'
          ), 0) AS other_expenses
        FROM hostels h
        WHERE h.id IN (SELECT get_royal_girls_hostel_ids())
      ) s
    ),
<<<<<<< HEAD
    'student_billing', (
      SELECT coalesce(json_agg(row_to_json(sb) ORDER BY sb.hostel_name, sb.student_name), '[]'::json)
=======
    'student_payments', (
      SELECT coalesce(json_agg(row_to_json(p) ORDER BY p.hostel_name, p.student_name), '[]'::json)
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
      FROM (
        SELECT
          h.name AS hostel_name,
          coalesce(st.full_name, st.student_code) AS student_name,
          st.student_code,
<<<<<<< HEAD
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
=======
          fr.fee_type,
          fr.amount,
          fr.status,
          fr.payment_date,
          fr.invoice_code
        FROM fee_records fr
        JOIN hostels h ON h.id = fr.hostel_id
        JOIN students st ON st.id = fr.student_id
        WHERE fr.hostel_id IN (SELECT get_royal_girls_hostel_ids())
          AND fr.billing_month = v_month_start
          AND fr.status IN ('paid', 'partial')
      ) p
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
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
          AND NOT is_ledger_vendor(e.vendor)
          AND e.title NOT LIKE 'Payment — %'
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
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_merged_profit_monthly_report(date) TO authenticated;

CREATE OR REPLACE FUNCTION get_merged_profit_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT can_access_shared_ledger() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_income', coalesce((
      SELECT sum(fr.amount)
      FROM fee_records fr
      WHERE fr.hostel_id IN (SELECT get_royal_girls_hostel_ids())
        AND fr.status IN ('paid', 'partial')
    ), 0),
    'total_expense', coalesce((
      SELECT sum(e.amount)
      FROM expenses e
      WHERE e.hostel_id IN (SELECT get_royal_girls_hostel_ids())
    ), 0),
    'categories', (
      SELECT coalesce(json_agg(row_to_json(c) ORDER BY c.value DESC), '[]'::json)
      FROM (
        SELECT
          coalesce(ec.name, 'General') AS name,
          sum(e.amount) AS value
        FROM expenses e
        LEFT JOIN expense_categories ec ON ec.id = e.category_id
        WHERE e.hostel_id IN (SELECT get_royal_girls_hostel_ids())
        GROUP BY coalesce(ec.name, 'General')
      ) c
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_merged_profit_overview() TO authenticated;
