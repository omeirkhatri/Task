-- ============================================
-- Remove unused status column from companies table
-- ============================================

-- Remove status column from companies table
ALTER TABLE "public"."companies" 
  DROP COLUMN IF EXISTS "status";
