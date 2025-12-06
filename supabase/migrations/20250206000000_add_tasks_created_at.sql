-- Add created_at column to tasks table (nullable first)
ALTER TABLE "public"."tasks" 
  ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone;

-- Update existing tasks to have created_at set to due_date minus 1 day
UPDATE "public"."tasks" 
SET "created_at" = ("due_date"::timestamp with time zone - INTERVAL '1 day')
WHERE "created_at" IS NULL;

-- Now make it NOT NULL with a default for future inserts
ALTER TABLE "public"."tasks" 
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "created_at" SET NOT NULL;
