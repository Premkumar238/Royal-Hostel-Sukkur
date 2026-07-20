-- Joining date and per-category mess options
ALTER TABLE students
ADD COLUMN IF NOT EXISTS joining_date date,
ADD COLUMN IF NOT EXISTS has_breakfast boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_lunch boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_dinner boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS breakfast_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS lunch_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS dinner_fee numeric DEFAULT 0;
