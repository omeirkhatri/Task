-- ============================================
-- Support Standalone Payments (One-off Services)
-- ============================================
-- This migration allows payment_transactions to exist without a payment_package_id
-- for one-off services like Teleconsultation, Doctor on Call, etc.
-- It also adds appointment_id to link standalone payments directly to appointments.

-- Step 1: Add appointment_id column to payment_transactions
ALTER TABLE "public"."payment_transactions" 
ADD COLUMN IF NOT EXISTS "appointment_id" bigint;

-- Step 2: Add foreign key constraint for appointment_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payment_transactions_appointment_id_fkey'
    ) THEN
        ALTER TABLE "public"."payment_transactions" 
        ADD CONSTRAINT "payment_transactions_appointment_id_fkey" 
        FOREIGN KEY (appointment_id) 
        REFERENCES appointments(id) 
        ON UPDATE CASCADE 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Create index for appointment_id
CREATE INDEX IF NOT EXISTS "payment_transactions_appointment_id_idx" 
ON "public"."payment_transactions" ("appointment_id");

-- Step 4: Drop the NOT NULL constraint on payment_package_id
-- First, we need to drop the foreign key constraint temporarily
ALTER TABLE "public"."payment_transactions" 
DROP CONSTRAINT IF EXISTS "payment_transactions_payment_package_id_fkey";

-- Step 5: Make payment_package_id nullable
ALTER TABLE "public"."payment_transactions" 
ALTER COLUMN "payment_package_id" DROP NOT NULL;

-- Step 6: Re-add the foreign key constraint (now allowing NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payment_transactions_payment_package_id_fkey'
    ) THEN
        ALTER TABLE "public"."payment_transactions" 
        ADD CONSTRAINT "payment_transactions_payment_package_id_fkey" 
        FOREIGN KEY (payment_package_id) 
        REFERENCES payment_packages(id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Step 7: Add check constraint to ensure at least one of payment_package_id or appointment_id is provided
-- Note: This is enforced at the application level, but we can add a database constraint too
ALTER TABLE "public"."payment_transactions" 
DROP CONSTRAINT IF EXISTS "payment_transactions_package_or_appointment_check";

ALTER TABLE "public"."payment_transactions" 
ADD CONSTRAINT "payment_transactions_package_or_appointment_check" 
CHECK (
    payment_package_id IS NOT NULL OR appointment_id IS NOT NULL
);

-- Step 8: Add comment to document the change
COMMENT ON COLUMN "public"."payment_transactions"."payment_package_id" IS 
'Foreign key to payment_packages. Can be NULL for standalone payments (one-off services).';

COMMENT ON COLUMN "public"."payment_transactions"."appointment_id" IS 
'Foreign key to appointments. Used to link standalone payments directly to appointments.';

