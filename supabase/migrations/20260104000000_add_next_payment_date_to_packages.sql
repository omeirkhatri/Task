-- Add next_payment_date column to payment_packages table
-- This allows flexible payment scheduling without fixed installments

ALTER TABLE "public"."payment_packages" 
ADD COLUMN IF NOT EXISTS "next_payment_date" date;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "payment_packages_next_payment_date_idx" 
ON "public"."payment_packages" ("next_payment_date");

