-- ============================================
-- Remove 'confirmed' status from appointments
-- ============================================

-- Drop the existing constraint
ALTER TABLE "public"."appointments" 
DROP CONSTRAINT IF EXISTS "appointments_status_check";

-- Recreate the constraint without 'confirmed'
ALTER TABLE "public"."appointments" 
ADD CONSTRAINT "appointments_status_check" 
CHECK (status IN ('scheduled', 'completed', 'cancelled'));

-- Update any existing 'confirmed' appointments to 'scheduled'
UPDATE "public"."appointments" 
SET status = 'scheduled' 
WHERE status = 'confirmed';

