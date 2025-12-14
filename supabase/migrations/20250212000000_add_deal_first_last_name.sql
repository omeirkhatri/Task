-- Add first_name and last_name columns to deals table
ALTER TABLE "public"."deals"
  ADD COLUMN IF NOT EXISTS "first_name" text,
  ADD COLUMN IF NOT EXISTS "last_name" text;

-- Migrate existing data: split name into first_name and last_name
-- For existing deals, try to split the name field
UPDATE "public"."deals"
SET 
  first_name = CASE 
    WHEN name ~ '^\s*$' THEN NULL
    WHEN name ~ ' ' THEN TRIM(SPLIT_PART(name, ' ', 1))
    ELSE TRIM(name)
  END,
  last_name = CASE 
    WHEN name ~ '^\s*$' THEN NULL
    WHEN name ~ ' ' THEN TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1))
    ELSE NULL
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- For deals with lead_id, update from the contact
UPDATE "public"."deals" d
SET 
  first_name = COALESCE(d.first_name, c.first_name),
  last_name = COALESCE(d.last_name, c.last_name)
FROM "public"."contacts" c
WHERE d.lead_id = c.id
  AND (d.first_name IS NULL OR d.last_name IS NULL);
