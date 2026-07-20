-- Mess operational expenses (initial monthly + daily)
DO $$ BEGIN
  CREATE TYPE mess_expense_type AS ENUM ('initial', 'daily');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS mess_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  expense_type mess_expense_type NOT NULL,
  billing_month date NOT NULL,
  expense_date date NOT NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  description text,
  expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mess_expenses_hostel ON mess_expenses(hostel_id);
CREATE INDEX IF NOT EXISTS idx_mess_expenses_month ON mess_expenses(hostel_id, billing_month);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mess_expenses_initial_per_month
ON mess_expenses (hostel_id, billing_month)
WHERE expense_type = 'initial';

ALTER TABLE mess_expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Tenant select mess_expenses" ON mess_expenses FOR SELECT
    USING (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant insert mess_expenses" ON mess_expenses FOR INSERT
    WITH CHECK (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant update mess_expenses" ON mess_expenses FOR UPDATE
    USING (has_hostel_access(hostel_id))
    WITH CHECK (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant delete mess_expenses" ON mess_expenses FOR DELETE
    USING (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TRIGGER mess_expenses_updated_at BEFORE UPDATE ON mess_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
