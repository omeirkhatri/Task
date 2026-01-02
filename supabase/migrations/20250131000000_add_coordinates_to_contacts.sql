-- ============================================
-- Add Latitude and Longitude to Contacts
-- ============================================

-- Add latitude and longitude columns to contacts table
ALTER TABLE "public"."contacts" 
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(11, 8);

-- Add check constraints for valid coordinate ranges
ALTER TABLE "public"."contacts" 
  ADD CONSTRAINT "contacts_latitude_check" 
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE "public"."contacts" 
  ADD CONSTRAINT "contacts_longitude_check" 
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Create index on coordinates for performance (only where both are not null)
CREATE INDEX IF NOT EXISTS "contacts_coordinates_idx" 
  ON "public"."contacts" (latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

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
    jsonb_path_query_array(co.email_jsonb, '$[*].email')::text as email_fts,
    co.phone_jsonb,
    jsonb_path_query_array(co.phone_jsonb, '$[*].number')::text as phone_fts,
    co.flat_villa_number,
    co.building_street,
    co.area,
    co.google_maps_link,
    co.latitude,
    co.longitude,
    co.phone_has_whatsapp,
    co.services_interested,
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
    c.name as company_name,
    count(DISTINCT t.id) as nb_tasks
FROM
    "public"."contacts" co
LEFT JOIN
    "public"."tasks" t ON co.id = t.contact_id
LEFT JOIN
    "public"."companies" c ON co.company_id = c.id
GROUP BY
    co.id, c.name;

