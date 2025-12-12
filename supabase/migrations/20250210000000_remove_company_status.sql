-- ============================================
-- Remove unused status column from companies table
-- ============================================

-- Drop the view that depends on the status column
DROP VIEW IF EXISTS "public"."companies_summary";

-- Remove status column from companies table
ALTER TABLE "public"."companies" 
  DROP COLUMN IF EXISTS "status";

-- Recreate the view without the status column
CREATE VIEW "public"."companies_summary"
    WITH (security_invoker=on)
AS
SELECT 
    c.*,
    count(DISTINCT t.id) as nb_tasks
FROM 
    "public"."companies" c
LEFT JOIN 
    "public"."tasks" t ON t.contact_id IN (
        SELECT id FROM "public"."contacts" WHERE company_id = c.id
    )
GROUP BY 
    c.id;
