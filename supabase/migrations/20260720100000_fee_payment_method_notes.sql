-- Payment method and optional notes on fee / invoice records
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'online', 'bank');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE fee_records
ADD COLUMN IF NOT EXISTS payment_method payment_method,
ADD COLUMN IF NOT EXISTS invoice_notes text;
