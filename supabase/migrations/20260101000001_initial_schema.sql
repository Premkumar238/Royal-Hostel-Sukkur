-- HostelPro SaaS - Initial Schema
-- Multi-tenant hostel management with Row Level Security

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum (
  'platform_super_admin',
  'hostel_super_admin',
  'hostel_manager',
  'hostel_staff'
);

create type student_status as enum ('active', 'inactive');
create type room_status as enum ('available', 'full', 'maintenance');
create type allocation_status as enum ('active', 'moving_out', 'checked_out');
create type fee_status as enum ('pending', 'paid', 'partial');
create type expense_status as enum ('pending', 'paid', 'due');
create type subscription_status as enum ('trial', 'active', 'suspended', 'cancelled');

-- ============================================================
-- HOSTELS (Tenants)
-- ============================================================
create table hostels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  contact_phone text,
  address text,
  logo_url text,
  currency text not null default 'PKR',
  timezone text not null default 'Asia/Karachi',
  subscription_status subscription_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role user_role not null default 'hostel_staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- HOSTEL MEMBERS (user ↔ hostel mapping)
-- ============================================================
create table hostel_members (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role user_role not null default 'hostel_staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(hostel_id, user_id)
);

create index idx_hostel_members_user on hostel_members(user_id);
create index idx_hostel_members_hostel on hostel_members(hostel_id);

-- ============================================================
-- STUDENTS
-- ============================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  student_code text not null,
  full_name text not null,
  phone text,
  cnic text,
  university text,
  status student_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hostel_id, student_code)
);

create index idx_students_hostel on students(hostel_id);
create index idx_students_status on students(hostel_id, status);

-- ============================================================
-- ROOMS
-- ============================================================
create table rooms (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  room_number text not null,
  floor int not null default 1,
  room_type text not null default 'single',
  capacity int not null default 1,
  price_per_month numeric(12, 2) not null default 0,
  status room_status not null default 'available',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hostel_id, room_number)
);

create index idx_rooms_hostel on rooms(hostel_id);
create index idx_rooms_status on rooms(hostel_id, status);

-- ============================================================
-- BEDS
-- ============================================================
create table beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  hostel_id uuid not null references hostels(id) on delete cascade,
  bed_label text not null,
  bed_type text default 'standard',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique(room_id, bed_label)
);

create index idx_beds_hostel on beds(hostel_id);
create index idx_beds_room on beds(room_id);

-- ============================================================
-- ALLOCATIONS
-- ============================================================
create table allocations (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  bed_id uuid not null references beds(id) on delete cascade,
  check_in_date date not null,
  check_out_date date,
  status allocation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_allocations_hostel on allocations(hostel_id);
create index idx_allocations_student on allocations(student_id);
create index idx_allocations_status on allocations(hostel_id, status);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(hostel_id, name)
);

create index idx_expense_categories_hostel on expense_categories(hostel_id);

-- ============================================================
-- EXPENSES
-- ============================================================
create table expenses (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  category_id uuid references expense_categories(id) on delete set null,
  title text not null,
  description text,
  vendor text,
  amount numeric(12, 2) not null,
  expense_date date not null default current_date,
  status expense_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_hostel on expenses(hostel_id);
create index idx_expenses_date on expenses(hostel_id, expense_date);

-- ============================================================
-- FEE RECORDS
-- ============================================================
create table fee_records (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  billing_month date not null,
  amount numeric(12, 2) not null,
  payment_date date,
  status fee_status not null default 'pending',
  invoice_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fee_records_hostel on fee_records(hostel_id);
create index idx_fee_records_student on fee_records(student_id);
create index idx_fee_records_month on fee_records(hostel_id, billing_month);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references hostels(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_activity_logs_hostel on activity_logs(hostel_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger hostels_updated_at before update on hostels
  for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger students_updated_at before update on students
  for each row execute function update_updated_at();
create trigger rooms_updated_at before update on rooms
  for each row execute function update_updated_at();
create trigger allocations_updated_at before update on allocations
  for each row execute function update_updated_at();
create trigger expenses_updated_at before update on expenses
  for each row execute function update_updated_at();
create trigger fee_records_updated_at before update on fee_records
  for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
