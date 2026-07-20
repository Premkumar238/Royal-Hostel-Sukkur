-- Separate rent and mess fee records
CREATE TYPE fee_type AS ENUM ('rent', 'mess');

ALTER TABLE fee_records
ADD COLUMN IF NOT EXISTS fee_type fee_type NOT NULL DEFAULT 'rent';

CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_records_student_month_type
ON fee_records (student_id, billing_month, fee_type);

-- Complaint management
CREATE TYPE complaint_status AS ENUM ('open', 'completed');

CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  description text NOT NULL,
  status complaint_status NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_hostel ON complaints(hostel_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(hostel_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_id);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select complaints" ON complaints FOR SELECT
  USING (has_hostel_access(hostel_id));
CREATE POLICY "Tenant insert complaints" ON complaints FOR INSERT
  WITH CHECK (has_hostel_access(hostel_id));
CREATE POLICY "Tenant update complaints" ON complaints FOR UPDATE
  USING (has_hostel_access(hostel_id))
  WITH CHECK (has_hostel_access(hostel_id));
CREATE POLICY "Tenant delete complaints" ON complaints FOR DELETE
  USING (has_hostel_access(hostel_id));

CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
