-- Cash out: withdraw from business budget

ALTER TABLE cash_budgets
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'in'
  CHECK (entry_type IN ('in', 'out'));

UPDATE cash_budgets SET entry_type = 'in' WHERE entry_type IS NULL;
