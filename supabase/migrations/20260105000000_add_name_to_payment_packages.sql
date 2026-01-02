-- Migration: Add name field to payment_packages
-- This allows packages to have a human-readable name instead of just IDs

-- Add name column
ALTER TABLE "public"."payment_packages" 
ADD COLUMN IF NOT EXISTS "name" text;

-- Create a function to generate package names
CREATE OR REPLACE FUNCTION generate_package_name(
  p_patient_id bigint,
  p_service_id bigint,
  p_package_type text,
  p_total_sessions integer DEFAULT NULL,
  p_total_hours numeric DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  patient_name text;
  service_name text;
  package_details text;
BEGIN
  -- Get patient name
  SELECT COALESCE(first_name || ' ' || last_name, 'Unknown Patient')
  INTO patient_name
  FROM contacts
  WHERE id = p_patient_id;
  
  -- Get service name
  IF p_service_id IS NOT NULL THEN
    SELECT COALESCE(name, 'Service')
    INTO service_name
    FROM services
    WHERE id = p_service_id;
  ELSE
    service_name := 'Service';
  END IF;
  
  -- Build package details based on type
  IF p_package_type = 'session-based' AND p_total_sessions IS NOT NULL THEN
    package_details := p_total_sessions || ' Sessions';
  ELSIF p_package_type = 'time-based' AND p_total_hours IS NOT NULL THEN
    package_details := p_total_hours || ' Hours';
  ELSE
    package_details := INITCAP(REPLACE(p_package_type, '-', ' '));
  END IF;
  
  -- Return formatted name: "Patient Name - Service Name - Package Details"
  RETURN patient_name || ' - ' || service_name || ' - ' || package_details;
END;
$$;

-- Update existing packages with generated names
UPDATE "public"."payment_packages"
SET name = generate_package_name(
  patient_id,
  service_id,
  package_type,
  total_sessions,
  total_hours
)
WHERE name IS NULL;

-- Create trigger to auto-generate name on insert/update
CREATE OR REPLACE FUNCTION auto_generate_package_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate name if it's not already set
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := generate_package_name(
      NEW.patient_id,
      NEW.service_id,
      NEW.package_type,
      NEW.total_sessions,
      NEW.total_hours
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS auto_generate_package_name_trigger ON "public"."payment_packages";
CREATE TRIGGER auto_generate_package_name_trigger
  BEFORE INSERT OR UPDATE ON "public"."payment_packages"
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_package_name();

