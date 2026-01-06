-- ============================================
-- Add city column to contacts table
-- ============================================
-- Run this SQL directly in your Supabase SQL editor or database
-- to fix the "Could not find the 'city' column" error

-- Add city column to contacts table if it doesn't exist
ALTER TABLE "public"."contacts" 
  ADD COLUMN IF NOT EXISTS "city" text;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'contacts' 
  AND column_name = 'city';

