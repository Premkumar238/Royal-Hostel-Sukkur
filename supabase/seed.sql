-- Demo seed data for development
-- Run AFTER creating a user via Supabase Auth dashboard or signup

-- Note: Replace 'YOUR_USER_ID' with actual auth.users id after signup

-- Demo hostel
insert into hostels (id, name, slug, contact_phone, address, currency, subscription_status)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Royal Heights Residency',
  'royal-heights',
  '+92 300 1234567',
  '124 Academic Ave, University District, Lahore, Pakistan',
  'PKR',
  'active'
);

-- Default expense categories
insert into expense_categories (hostel_id, name) values
  ('a0000000-0000-0000-0000-000000000001', 'Salary'),
  ('a0000000-0000-0000-0000-000000000001', 'Electricity'),
  ('a0000000-0000-0000-0000-000000000001', 'Water'),
  ('a0000000-0000-0000-0000-000000000001', 'Maintenance'),
  ('a0000000-0000-0000-0000-000000000001', 'Supplies');

-- Demo rooms
insert into rooms (hostel_id, room_number, floor, room_type, capacity, price_per_month, status) values
  ('a0000000-0000-0000-0000-000000000001', '101', 1, 'Single Deluxe', 1, 450, 'available'),
  ('a0000000-0000-0000-0000-000000000001', '102', 1, 'Double Occupancy', 2, 350, 'full'),
  ('a0000000-0000-0000-0000-000000000001', '201', 2, '4-Bed Dorm', 4, 250, 'available'),
  ('a0000000-0000-0000-0000-000000000001', '202', 2, 'Single Deluxe', 1, 450, 'maintenance'),
  ('a0000000-0000-0000-0000-000000000001', 'A-101', 1, 'Double Occupancy', 2, 400, 'full'),
  ('a0000000-0000-0000-0000-000000000001', 'B-204', 2, 'Single Deluxe', 1, 450, 'full');

-- Demo students
insert into students (hostel_id, student_code, full_name, phone, cnic, university, status) values
  ('a0000000-0000-0000-0000-000000000001', 'STU-8821', 'John Doe', '+92 301 1111111', '42101-9283741-3', 'LUMS', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'STU-8822', 'Sarah Ahmed', '+92 302 2222222', '42101-9283742-4', 'FAST', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'STU-8823', 'Ali Khan', '+92 303 3333333', '42101-9283743-5', 'UET', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'STU-8824', 'Fatima Noor', '+92 304 4444444', '42101-9283744-6', 'GCU', 'inactive');

-- Demo fee records
insert into fee_records (hostel_id, student_id, billing_month, amount, payment_date, status, invoice_code)
select
  'a0000000-0000-0000-0000-000000000001',
  s.id,
  date_trunc('month', current_date)::date,
  450,
  case when s.student_code in ('STU-8821', 'STU-8822') then current_date else null end,
  case when s.student_code in ('STU-8821', 'STU-8822') then 'paid'::fee_status else 'pending'::fee_status end,
  'INV-' || substr(s.student_code, 5)
from students s
where s.hostel_id = 'a0000000-0000-0000-0000-000000000001';

-- Demo expenses
insert into expenses (hostel_id, category_id, title, description, vendor, amount, expense_date, status)
select
  'a0000000-0000-0000-0000-000000000001',
  ec.id,
  'Electricity Bill - ' || to_char(current_date, 'Mon'),
  'Monthly electricity charges',
  'City Power Grid',
  2450,
  current_date - interval '3 days',
  'paid'::expense_status
from expense_categories ec
where ec.hostel_id = 'a0000000-0000-0000-0000-000000000001' and ec.name = 'Electricity';

insert into expenses (hostel_id, category_id, title, description, vendor, amount, expense_date, status)
select
  'a0000000-0000-0000-0000-000000000001',
  ec.id,
  'Staff Salaries - ' || to_char(current_date, 'Mon'),
  'Monthly staff payroll',
  'Internal',
  5400,
  current_date - interval '5 days',
  'paid'::expense_status
from expense_categories ec
where ec.hostel_id = 'a0000000-0000-0000-0000-000000000001' and ec.name = 'Salary';

-- After creating your auth user, run this to link them:
-- UPDATE profiles SET role = 'hostel_super_admin', full_name = 'Alex Rivera' WHERE id = 'YOUR_USER_ID';
-- INSERT INTO hostel_members (hostel_id, user_id, role) VALUES ('a0000000-0000-0000-0000-000000000001', 'YOUR_USER_ID', 'hostel_super_admin');
