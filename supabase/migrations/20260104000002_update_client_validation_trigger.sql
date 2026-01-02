-- Update the trigger function to handle NULL better
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

