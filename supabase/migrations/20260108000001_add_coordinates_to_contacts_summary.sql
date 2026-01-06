-- ============================================
-- Add latitude and longitude to contacts_summary view
-- ============================================
-- These columns are needed for map displays and transport routing

-- Update contacts_summary view to include latitude and longitude
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
    co.google_maps_link, co.phone_has_whatsapp, co.services_interested, co.description, 
    co.background, co.avatar, co.first_seen, co.last_seen, 
    co.has_newsletter, co.status, co.tags, co.company_id, co.sales_id, co.linkedin_url, 
    co.archived_at, c.name;

