-- HostelPro SaaS - Row Level Security Policies

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns hostel IDs the current user belongs to
create or replace function get_user_hostel_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select hostel_id
  from hostel_members
  where user_id = auth.uid()
    and is_active = true;
$$;

-- Check if current user is platform super admin
create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'platform_super_admin'
  );
$$;

-- Check if user has access to a specific hostel
create or replace function has_hostel_access(p_hostel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_platform_admin()
    or p_hostel_id in (select get_user_hostel_ids());
$$;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table hostels enable row level security;
alter table profiles enable row level security;
alter table hostel_members enable row level security;
alter table students enable row level security;
alter table rooms enable row level security;
alter table beds enable row level security;
alter table allocations enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table fee_records enable row level security;
alter table activity_logs enable row level security;

-- ============================================================
-- HOSTELS POLICIES
-- ============================================================
create policy "Platform admin sees all hostels"
  on hostels for select
  using (is_platform_admin() or id in (select get_user_hostel_ids()));

create policy "Platform admin manages hostels"
  on hostels for all
  using (is_platform_admin())
  with check (is_platform_admin());

create policy "Hostel admin updates own hostel"
  on hostels for update
  using (id in (select get_user_hostel_ids()))
  with check (id in (select get_user_hostel_ids()));

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
create policy "Users can view own profile"
  on profiles for select
  using (id = auth.uid() or is_platform_admin());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- HOSTEL MEMBERS POLICIES
-- ============================================================
create policy "Members see own hostel memberships"
  on hostel_members for select
  using (user_id = auth.uid() or hostel_id in (select get_user_hostel_ids()) or is_platform_admin());

create policy "Platform admin manages memberships"
  on hostel_members for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- ============================================================
-- GENERIC TENANT POLICIES (template for all hostel-scoped tables)
-- ============================================================

-- STUDENTS
create policy "Tenant select students" on students for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert students" on students for insert
  with check (has_hostel_access(hostel_id));
create policy "Tenant update students" on students for update
  using (has_hostel_access(hostel_id))
  with check (has_hostel_access(hostel_id));
create policy "Tenant delete students" on students for delete
  using (has_hostel_access(hostel_id));

-- ROOMS
create policy "Tenant select rooms" on rooms for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert rooms" on rooms for insert
  with check (has_hostel_access(hostel_id));
create policy "Tenant update rooms" on rooms for update
  using (has_hostel_access(hostel_id))
  with check (has_hostel_access(hostel_id));
create policy "Tenant delete rooms" on rooms for delete
  using (has_hostel_access(hostel_id));

-- BEDS
create policy "Tenant select beds" on beds for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert beds" on beds for insert
  with check (has_hostel_access(hostel_id));
create policy "Tenant update beds" on beds for update
  using (has_hostel_access(hostel_id))
  with check (has_hostel_access(hostel_id));
create policy "Tenant delete beds" on beds for delete
  using (has_hostel_access(hostel_id));

-- ALLOCATIONS
create policy "Tenant select allocations" on allocations for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert allocations" on allocations for insert
  with check (has_hostel_access(hostel_id));
create policy "Tenant update allocations" on allocations for update
  using (has_hostel_access(hostel_id))
  with check (has_hostel_access(hostel_id));
create policy "Tenant delete allocations" on allocations for delete
  using (has_hostel_access(hostel_id));

-- EXPENSE CATEGORIES
create policy "Tenant select expense_categories" on expense_categories for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert expense_categories" on expense_categories for insert
  with check (has_hostel_access(hostel_id));
create policy "Tenant update expense_categories" on expense_categories for update
  using (has_hostel_access(hostel_id))
  with check (has_hostel_access(hostel_id));
create policy "Tenant delete expense_categories" on expense_categories for delete
  using (has_hostel_access(hostel_id));

-- EXPENSES
create policy "Tenant select expenses" on expenses for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert expenses" on expenses for insert
  with check (has_hostel_access(hostel_id));
create policy "Tenant update expenses" on expenses for update
  using (has_hostel_access(hostel_id))
  with check (has_hostel_access(hostel_id));
create policy "Tenant delete expenses" on expenses for delete
  using (has_hostel_access(hostel_id));

-- FEE RECORDS
create policy "Tenant select fee_records" on fee_records for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert fee_records" on fee_records for insert
  with check (has_hostel_access(hostel_id));
create policy "Tenant update fee_records" on fee_records for update
  using (has_hostel_access(hostel_id))
  with check (has_hostel_access(hostel_id));
create policy "Tenant delete fee_records" on fee_records for delete
  using (has_hostel_access(hostel_id));

-- ACTIVITY LOGS
create policy "Tenant select activity_logs" on activity_logs for select
  using (has_hostel_access(hostel_id));
create policy "Tenant insert activity_logs" on activity_logs for insert
  with check (has_hostel_access(hostel_id));

-- ============================================================
-- DASHBOARD RPC FUNCTION
-- ============================================================
create or replace function get_dashboard_stats(p_hostel_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  v_month_start date := date_trunc('month', current_date)::date;
begin
  if not has_hostel_access(p_hostel_id) then
    raise exception 'Access denied';
  end if;

  select json_build_object(
    'total_students', (
      select count(*) from students where hostel_id = p_hostel_id
    ),
    'active_students', (
      select count(*) from students where hostel_id = p_hostel_id and status = 'active'
    ),
    'total_rooms', (
      select count(*) from rooms where hostel_id = p_hostel_id
    ),
    'occupied_rooms', (
      select count(*) from rooms where hostel_id = p_hostel_id and status = 'full'
    ),
    'vacant_rooms', (
      select count(*) from rooms where hostel_id = p_hostel_id and status = 'available'
    ),
    'maintenance_rooms', (
      select count(*) from rooms where hostel_id = p_hostel_id and status = 'maintenance'
    ),
    'monthly_income', (
      select coalesce(sum(amount), 0) from fee_records
      where hostel_id = p_hostel_id
        and status = 'paid'
        and billing_month >= v_month_start
    ),
    'monthly_expenses', (
      select coalesce(sum(amount), 0) from expenses
      where hostel_id = p_hostel_id
        and expense_date >= v_month_start
    ),
    'pending_fees', (
      select coalesce(sum(amount), 0) from fee_records
      where hostel_id = p_hostel_id and status = 'pending'
    )
  ) into result;

  return result;
end;
$$;

-- Financial chart data (last 6 months)
create or replace function get_financial_chart(p_hostel_id uuid, p_months int default 6)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not has_hostel_access(p_hostel_id) then
    raise exception 'Access denied';
  end if;

  select json_agg(row_to_json(t)) into result
  from (
    select
      to_char(d.month_date, 'Mon') as month,
      coalesce((
        select sum(amount) from fee_records
        where hostel_id = p_hostel_id and status = 'paid'
          and billing_month = d.month_date
      ), 0) as income,
      coalesce((
        select sum(amount) from expenses
        where hostel_id = p_hostel_id
          and date_trunc('month', expense_date) = d.month_date
      ), 0) as expenses
    from (
      select generate_series(
        date_trunc('month', current_date - ((p_months - 1) || ' months')::interval),
        date_trunc('month', current_date),
        '1 month'::interval
      )::date as month_date
    ) d
    order by d.month_date
  ) t;

  return coalesce(result, '[]'::json);
end;
$$;
