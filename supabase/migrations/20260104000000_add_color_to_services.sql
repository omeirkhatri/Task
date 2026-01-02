-- ============================================
-- Add color column to services table
-- ============================================

-- Add color column to services table
ALTER TABLE "public"."services" 
ADD COLUMN IF NOT EXISTS "color" text;

-- Set default colors for existing services based on name
UPDATE "public"."services" 
SET "color" = CASE 
  WHEN LOWER(name) = 'doctor on call' THEN '#3b82f6'
  WHEN LOWER(name) = 'lab test' THEN '#a855f7'
  WHEN LOWER(name) = 'teleconsultation' THEN '#10b981'
  WHEN LOWER(name) = 'physiotherapy' THEN '#f97316'
  WHEN LOWER(name) = 'caregiver' THEN '#ec4899'
  WHEN LOWER(name) = 'iv therapy' THEN '#ef4444'
  WHEN LOWER(name) = 'nurse on call' THEN '#06b6d4'
  WHEN LOWER(name) = 'blood test' THEN '#8b5cf6'
  WHEN LOWER(name) = 'nanny' THEN '#14b8a6'
  WHEN LOWER(name) = 'elderly care' THEN '#f59e0b'
  ELSE '#3b82f6' -- Default blue
END
WHERE "color" IS NULL;

