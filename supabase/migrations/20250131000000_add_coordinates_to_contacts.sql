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

-- Note: The contacts_summary view will be updated in later migrations
-- This migration only adds the coordinate columns

