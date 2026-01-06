-- ============================================
-- Make date_received nullable in payment_transactions
-- ============================================
-- This allows payments to be recorded before they are actually received

-- Make date_received nullable
ALTER TABLE "public"."payment_transactions" 
ALTER COLUMN "date_received" DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN "public"."payment_transactions"."date_received" IS 
'Date when payment was received. Can be NULL if payment was made but not yet received.';

