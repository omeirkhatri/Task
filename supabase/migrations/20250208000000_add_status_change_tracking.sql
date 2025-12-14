-- ============================================
-- Add Status Change Tracking to Activity Log
-- ============================================

-- Add columns to track deal status changes
ALTER TABLE "public"."activity_log" 
ADD COLUMN IF NOT EXISTS "old_stage" text,
ADD COLUMN IF NOT EXISTS "new_stage" text,
ADD COLUMN IF NOT EXISTS "company_id" bigint;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS "activity_log_deal_id_idx" ON "public"."activity_log" ("deal_id");
CREATE INDEX IF NOT EXISTS "activity_log_company_id_idx" ON "public"."activity_log" ("company_id");


