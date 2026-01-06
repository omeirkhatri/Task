-- ============================================
-- Ensure payment_packages can only reference clients (not leads)
-- ============================================

-- Create a function to check if a contact is a client (has a converted deal)
CREATE OR REPLACE FUNCTION is_client(contact_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM deals d 
    WHERE (d.lead_id = contact_id OR (d.contact_ids IS NOT NULL AND contact_id = ANY(d.contact_ids)))
    AND d.stage = 'converted'
    AND d.archived_at IS NULL
  );
END;
$$;

-- Create a trigger function to validate that patient_id is a client
CREATE OR REPLACE FUNCTION validate_payment_package_client()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if patient_id is provided (should be caught by NOT NULL constraint, but provide better error)
  IF NEW.patient_id IS NULL THEN
    RAISE EXCEPTION 'Payment packages require a patient (client). Please select a client.';
  END IF;
  
  -- Check if the patient_id references a client (has a converted deal)
  IF NOT is_client(NEW.patient_id) THEN
    RAISE EXCEPTION 'Payment packages can only be created for clients (contacts with converted deals). Contact ID % is not a client. Please ensure the contact has a converted deal.', NEW.patient_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate before insert or update
DROP TRIGGER IF EXISTS payment_packages_validate_client ON "public"."payment_packages";

CREATE TRIGGER payment_packages_validate_client
  BEFORE INSERT OR UPDATE OF patient_id ON "public"."payment_packages"
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_package_client();

-- Add a comment to document the validation
COMMENT ON FUNCTION validate_payment_package_client() 
IS 'Ensures payment packages can only be created for clients (contacts with converted deals), not leads';

