-- Student security advance + dashboard total

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS advance_amount numeric(12, 2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hostel_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_month_start date := date_trunc('month', current_date)::date;
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
        AND status IN ('paid', 'partial')
        AND billing_month >= v_month_start
    ),
    'monthly_expenses', (
      SELECT coalesce(sum(amount), 0) FROM expenses
      WHERE hostel_id = p_hostel_id
        AND expense_date >= v_month_start
    ),
    'pending_fees', (
      SELECT coalesce(sum(amount), 0) FROM fee_records
      WHERE hostel_id = p_hostel_id AND status = 'pending'
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

-- Include security advance in merged profit monthly report
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
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_merged_profit_monthly_report(date) TO authenticated;
