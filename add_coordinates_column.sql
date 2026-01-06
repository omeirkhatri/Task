-- ============================================
-- Add coordinates column to contacts table
-- ============================================
-- This column stores formatted coordinates as "lat, lng" string
-- Run this SQL directly in your Supabase SQL editor or database
-- to fix the "Could not find the 'coordinates' column" error

-- First, ensure latitude and longitude columns exist
ALTER TABLE "public"."contacts" 
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(11, 8);

-- Add check constraints for valid coordinate ranges (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contacts_latitude_check'
  ) THEN
    ALTER TABLE "public"."contacts" 
      ADD CONSTRAINT "contacts_latitude_check" 
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contacts_longitude_check'
  ) THEN
    ALTER TABLE "public"."contacts" 
      ADD CONSTRAINT "contacts_longitude_check" 
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END $$;

-- Add coordinates column as a regular text column
-- This stores the formatted "latitude, longitude" string for form input
-- The form component handles syncing this with latitude/longitude columns
ALTER TABLE "public"."contacts" 
  ADD COLUMN IF NOT EXISTS "coordinates" text;

-- Update contacts_summary view to include coordinates
DROP VIEW IF EXISTS "public"."contacts_summary";

CREATE VIEW "public"."contacts_summary"
AS
SELECT 
    co.id,
    co.first_name,
    co.last_name,
    co.gender,
    co.title,
    co.email_jsonb,
    jsonb_path_query_array(co.email_jsonb, '$[*]."email"'::jsonpath)::text as email_fts,
    co.phone_jsonb,
    jsonb_path_query_array(co.phone_jsonb, '$[*]."number"'::jsonpath)::text as phone_fts,
    co.flat_villa_number,
    co.building_street,
    co.area,
    co.city,
    co.latitude,
    co.longitude,
    co.coordinates,
    co.google_maps_link,
    co.phone_has_whatsapp,
    co.services_interested,
    co.description,
    co.background,
    co.avatar,
    co.first_seen,
    co.last_seen,
    co.has_newsletter,
    co.status,
    co.tags,
    co.company_id,
    co.sales_id,
    co.linkedin_url,
    co.archived_at,
    c.name as company_name,
    count(DISTINCT t.id) as nb_tasks,
    -- Add isClient computed column: true if contact has a converted deal
    EXISTS (
        SELECT 1 
        FROM deals d 
        WHERE (d.lead_id = co.id OR (d.contact_ids IS NOT NULL AND co.id = ANY(d.contact_ids)))
        AND d.stage = 'converted'
    ) as "isClient"
FROM
    "public"."contacts" co
LEFT JOIN
    "public"."tasks" t ON co.id = t.contact_id
LEFT JOIN
    "public"."companies" c ON co.company_id = c.id
GROUP BY
    co.id, co.first_name, co.last_name, co.gender, co.title, co.email_jsonb, co.phone_jsonb,
    co.flat_villa_number, co.building_street, co.area, co.city, co.latitude, co.longitude, 
    co.coordinates, co.google_maps_link, co.phone_has_whatsapp, co.services_interested, 
    co.description, co.background, co.avatar, co.first_seen, co.last_seen, 
    co.has_newsletter, co.status, co.tags, co.company_id, co.sales_id, co.linkedin_url, 
    co.archived_at, c.name;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'contacts' 
  AND column_name IN ('latitude', 'longitude', 'coordinates')
ORDER BY column_name;

