-- ============================================
-- Ensure Attachments Storage Bucket Exists
-- ============================================
-- NOTE: Storage buckets must be created manually in Supabase Dashboard
-- Go to Storage > New Bucket > Name: "attachments" > Public: Yes
-- Then run this migration to set up the policies

-- Create the attachments bucket if it doesn't exist (for local development)
-- This bucket is used for bug report screenshots and other attachments
DO $$
BEGIN
  -- Check if storage schema exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'storage'
  ) THEN
    -- Storage schema has changed across versions (some older versions don't have the "public" column).
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage'
        AND table_name = 'buckets'
        AND column_name = 'public'
    ) THEN
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('attachments', 'attachments', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    ELSE
      INSERT INTO storage.buckets (id, name)
      VALUES ('attachments', 'attachments')
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- Create storage policies for the attachments bucket
-- Allow public read access (so screenshots can be viewed)
DROP POLICY IF EXISTS "Attachments public read" ON storage.objects;
CREATE POLICY "Attachments public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'attachments');

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Attachments authenticated insert" ON storage.objects;
CREATE POLICY "Attachments authenticated insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to delete files
DROP POLICY IF EXISTS "Attachments authenticated delete" ON storage.objects;
CREATE POLICY "Attachments authenticated delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments');

