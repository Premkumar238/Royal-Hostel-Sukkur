-- Staff / employees for salary management
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Watchman',
  monthly_salary numeric(12, 2) NOT NULL DEFAULT 0,
  phone text,
  status text NOT NULL DEFAULT 'active',
  last_salary_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_hostel ON employees(hostel_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(hostel_id, status);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Tenant select employees" ON employees FOR SELECT
    USING (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant insert employees" ON employees FOR INSERT
    WITH CHECK (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant update employees" ON employees FOR UPDATE
    USING (has_hostel_access(hostel_id))
    WITH CHECK (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant delete employees" ON employees FOR DELETE
    USING (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TRIGGER employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
