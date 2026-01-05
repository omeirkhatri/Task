-- ============================================
-- Add Route-Related Fields to Appointments
-- ============================================
-- This migration adds route planning fields to the appointments table
-- to support the Driver Assignment & Dispatch System

-- Add route-related fields to appointments table
ALTER TABLE "public"."appointments" 
ADD COLUMN IF NOT EXISTS "pending_client_confirmation" boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "route_locked" boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "suggested_time_change" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "client_confirmation_status" text;

-- Add check constraint for client_confirmation_status
ALTER TABLE "public"."appointments" 
ADD CONSTRAINT "appointments_client_confirmation_status_check" 
CHECK (client_confirmation_status IS NULL OR client_confirmation_status IN ('pending', 'approved', 'declined'));

-- Add index for faster queries on route-related fields
CREATE INDEX IF NOT EXISTS "appointments_pending_client_confirmation_idx" ON "public"."appointments" ("pending_client_confirmation");
CREATE INDEX IF NOT EXISTS "appointments_route_locked_idx" ON "public"."appointments" ("route_locked");
CREATE INDEX IF NOT EXISTS "appointments_client_confirmation_status_idx" ON "public"."appointments" ("client_confirmation_status");

