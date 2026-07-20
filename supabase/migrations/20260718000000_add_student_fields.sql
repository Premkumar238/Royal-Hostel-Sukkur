-- Add optional student fields to the students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'student',
ADD COLUMN IF NOT EXISTS origin text DEFAULT 'royal',
ADD COLUMN IF NOT EXISTS registration_no text,
ADD COLUMN IF NOT EXISTS registration_date date,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS batch text,
ADD COLUMN IF NOT EXISTS accommodation_semester text,
ADD COLUMN IF NOT EXISTS permanent_address text,
ADD COLUMN IF NOT EXISTS father_name text,
ADD COLUMN IF NOT EXISTS father_phone text,
ADD COLUMN IF NOT EXISTS landline text,
ADD COLUMN IF NOT EXISTS emergency_contact_1 text,
ADD COLUMN IF NOT EXISTS emergency_contact_2 text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS student_image_url text,
ADD COLUMN IF NOT EXISTS student_cnic_url text,
ADD COLUMN IF NOT EXISTS father_cnic_url text;

-- Create storage bucket for student documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies for student-documents bucket
-- Allow public select/read access to anyone
CREATE POLICY "Public Read Access student-documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-documents');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Insert student-documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-documents');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated Update student-documents" ON storage.objects
  FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'student-documents');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated Delete student-documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'student-documents');
