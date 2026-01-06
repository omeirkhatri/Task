-- Fix the update trigger that might be causing login issues

-- Drop the update trigger
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users CASCADE;

-- Drop and recreate the update function to handle missing sales records
DROP FUNCTION IF EXISTS public.handle_update_user() CASCADE;

CREATE FUNCTION public.handle_update_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sales_exists BOOLEAN;
BEGIN
  -- Check if sales record exists
  SELECT EXISTS(SELECT 1 FROM sales WHERE user_id = new.id) INTO sales_exists;
  
  -- Only update if sales record exists
  IF sales_exists THEN
    UPDATE sales
    SET 
      first_name = COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'first_name'), ''),
        first_name  -- Keep existing if new is null/empty
      ),
      last_name = COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'last_name'), ''),
        last_name  -- Keep existing if new is null/empty
      ),
      email = COALESCE(new.email, email)  -- Keep existing if new is null
    WHERE user_id = new.id;
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail - allow auth updates to proceed
    RAISE WARNING 'handle_update_user failed: %', SQLERRM;
    RETURN new;
END;
$$;

-- Recreate the update trigger
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_user();

