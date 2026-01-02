-- ============================================
-- Add renewed_from_package_id to payment_packages
-- ============================================

-- Add renewed_from_package_id column to track package renewals
ALTER TABLE "public"."payment_packages" 
ADD COLUMN IF NOT EXISTS "renewed_from_package_id" bigint;

-- Add foreign key constraint to link to parent package
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payment_packages_renewed_from_package_id_fkey'
    ) THEN
        ALTER TABLE "public"."payment_packages" 
        ADD CONSTRAINT "payment_packages_renewed_from_package_id_fkey" 
        FOREIGN KEY (renewed_from_package_id) 
        REFERENCES payment_packages(id) 
        ON UPDATE CASCADE 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "payment_packages_renewed_from_package_id_idx" 
ON "public"."payment_packages" ("renewed_from_package_id");

