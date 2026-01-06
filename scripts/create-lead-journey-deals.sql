-- ============================================
-- Create Lead Journey Deals for Contacts
-- ============================================
-- This creates deals (lead-journey entries) for all contacts that don't have one yet

INSERT INTO "public"."deals" (
    name,
    lead_id,
    first_name,
    last_name,
    stage,
    index,
    sales_id,
    company_id,
    created_at,
    updated_at
)
SELECT 
    COALESCE(TRIM(c.first_name || ' ' || c.last_name), 'New Lead') as name,
    c.id as lead_id,
    c.first_name,
    c.last_name,
    -- Map contact status to deal stage
    CASE 
        WHEN c.status = 'new' THEN 'new'
        WHEN c.status = 'contacted' THEN 'contacted'
        WHEN c.status = 'qualified' THEN 'qualified'
        ELSE 'new'
    END as stage,
    0 as index,
    c.sales_id,
    c.company_id,
    c.first_seen as created_at,
    c.last_seen as updated_at
FROM "public"."contacts" c
WHERE c.archived_at IS NULL
  AND NOT EXISTS (
      -- Don't create if a deal already exists for this contact
      SELECT 1 
      FROM "public"."deals" d 
      WHERE d.lead_id = c.id 
        AND d.archived_at IS NULL
  )
ORDER BY c.id;

