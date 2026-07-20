CREATE TABLE IF NOT EXISTS police_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL UNIQUE REFERENCES hostels(id) ON DELETE CASCADE,
  owner_name text,
  owner_contact text,
  owner_email text,
  manager_name text,
  manager_contact text,
  hostel_name text,
  address text,
  police_verification_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_police_verifications_hostel ON police_verifications(hostel_id);

ALTER TABLE police_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Tenant select police_verifications" ON police_verifications FOR SELECT
    USING (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant insert police_verifications" ON police_verifications FOR INSERT
    WITH CHECK (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant update police_verifications" ON police_verifications FOR UPDATE
    USING (has_hostel_access(hostel_id))
    WITH CHECK (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Tenant delete police_verifications" ON police_verifications FOR DELETE
    USING (has_hostel_access(hostel_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TRIGGER police_verifications_updated_at BEFORE UPDATE ON police_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
