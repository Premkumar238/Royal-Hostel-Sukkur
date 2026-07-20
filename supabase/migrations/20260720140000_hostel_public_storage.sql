-- Public assets (login hero, etc.) — upload via Storage UI: bucket hostel-public, file hostel.jpeg



INSERT INTO storage.buckets (id, name, public)

VALUES ('hostel-public', 'hostel-public', true)

ON CONFLICT (id) DO UPDATE SET public = true;



DROP POLICY IF EXISTS "Public read hostel-public" ON storage.objects;

CREATE POLICY "Public read hostel-public"

  ON storage.objects FOR SELECT

  USING (bucket_id = 'hostel-public');



DROP POLICY IF EXISTS "Authenticated upload hostel-public" ON storage.objects;

CREATE POLICY "Authenticated upload hostel-public"

  ON storage.objects FOR INSERT

  TO authenticated

  WITH CHECK (bucket_id = 'hostel-public');



DROP POLICY IF EXISTS "Authenticated update hostel-public" ON storage.objects;

CREATE POLICY "Authenticated update hostel-public"

  ON storage.objects FOR UPDATE

  TO authenticated

  USING (bucket_id = 'hostel-public')

  WITH CHECK (bucket_id = 'hostel-public');



DROP POLICY IF EXISTS "Authenticated delete hostel-public" ON storage.objects;

CREATE POLICY "Authenticated delete hostel-public"

  ON storage.objects FOR DELETE

  TO authenticated

  USING (bucket_id = 'hostel-public');


