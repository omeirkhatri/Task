-- ============================================
-- Add description field to leads (contacts)
-- ============================================

-- Add description column to contacts table
ALTER TABLE "public"."contacts" 
  ADD COLUMN IF NOT EXISTS "description" text;

-- Update contacts_summary view to include description
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


