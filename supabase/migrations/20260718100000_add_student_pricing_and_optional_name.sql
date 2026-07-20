-- Pricing fields used by the student form
ALTER TABLE students
ADD COLUMN IF NOT EXISTS monthly_rent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_mess boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mess_fee numeric DEFAULT 0;

-- Allow optional student name at registration
ALTER TABLE students ALTER COLUMN full_name DROP NOT NULL;
