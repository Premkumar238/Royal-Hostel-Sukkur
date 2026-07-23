-- Business cash / budget investments per hostel

CREATE TABLE IF NOT EXISTS cash_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_budgets_hostel_id ON cash_budgets(hostel_id);
CREATE INDEX IF NOT EXISTS idx_cash_budgets_entry_date ON cash_budgets(entry_date DESC);

ALTER TABLE cash_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hostel members manage cash_budgets" ON cash_budgets;

CREATE POLICY "Hostel members manage cash_budgets"
  ON cash_budgets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM hostel_members hm
      WHERE hm.hostel_id = cash_budgets.hostel_id
        AND hm.user_id = auth.uid()
        AND hm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM hostel_members hm
      WHERE hm.hostel_id = cash_budgets.hostel_id
        AND hm.user_id = auth.uid()
        AND hm.is_active = true
    )
  );
