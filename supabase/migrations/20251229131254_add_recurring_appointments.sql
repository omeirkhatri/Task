-- ============================================
-- Add Recurring Appointments Support
-- ============================================

-- Add recurrence fields to appointments table
ALTER TABLE "public"."appointments" 
ADD COLUMN IF NOT EXISTS "recurrence_id" uuid,
ADD COLUMN IF NOT EXISTS "recurrence_config" jsonb,
ADD COLUMN IF NOT EXISTS "is_recurring" boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "recurrence_sequence" integer;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS "appointments_recurrence_id_idx" ON "public"."appointments" ("recurrence_id");
CREATE INDEX IF NOT EXISTS "appointments_is_recurring_idx" ON "public"."appointments" ("is_recurring");

-- Add appointment_id to activity_log table for appointment activity tracking
ALTER TABLE "public"."activity_log" 
ADD COLUMN IF NOT EXISTS "appointment_id" bigint;

-- Add index for appointment_id in activity_log
CREATE INDEX IF NOT EXISTS "activity_log_appointment_id_idx" ON "public"."activity_log" ("appointment_id");

-- Add foreign key constraint for appointment_id in activity_log
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activity_log_appointment_id_fkey'
    ) THEN
        ALTER TABLE "public"."activity_log" 
        ADD CONSTRAINT "activity_log_appointment_id_fkey" 
        FOREIGN KEY (appointment_id) 
        REFERENCES appointments(id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add comment explaining recurrence_config structure
COMMENT ON COLUMN "public"."appointments"."recurrence_config" IS 'Stores recurrence pattern configuration. Only set on parent appointment (recurrence_sequence = 0). Structure: {"pattern": "daily|weekly|monthly|yearly|custom", "interval": number, "end_type": "date|occurrences", "end_date": "YYYY-MM-DD"|null, "occurrences": number|null, "days_of_week": [0-6]|null, "day_of_month": number|null, "week_of_month": number|null, "month": number|null}';

