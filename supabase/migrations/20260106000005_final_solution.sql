-- FINAL SOLUTION: Disable trigger, users will be created via edge function
-- The edge function already has logic to create sales records manually

-- Step 1: Completely remove the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Now users can be created from Supabase Auth dashboard
-- The sales record will be created by the edge function when needed
-- OR we can create a simpler trigger that doesn't fail

-- Step 3: Create a minimal trigger that won't fail
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sales_count INT;
  user_first_name TEXT := 'User';
  user_last_name TEXT := '';
  email_prefix TEXT;
BEGIN
  -- Only proceed if email exists
  IF new.email IS NULL OR new.email = '' THEN
    RETURN new; -- Allow user creation even if email is missing
  END IF;

  -- Get count of existing sales records
  SELECT COUNT(id) INTO sales_count FROM public.sales;

  -- Extract email prefix
  email_prefix := SPLIT_PART(new.email, '@', 1);
  
  -- Set first_name - use metadata, email prefix, or 'User'
  IF new.raw_user_meta_data IS NOT NULL THEN
    user_first_name := COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'first_name'), ''),
      email_prefix,
      'User'
    );
  ELSE
    user_first_name := COALESCE(email_prefix, 'User');
  END IF;
  
  -- Ensure first_name is never null or empty
  IF user_first_name IS NULL OR LENGTH(user_first_name) = 0 THEN
    user_first_name := 'User';
  END IF;

  -- Set last_name
  IF new.raw_user_meta_data IS NOT NULL THEN
    user_last_name := COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'last_name'), ''),
      ''
    );
  END IF;

  -- Insert sales record - use exception handling to not block user creation
  BEGIN
    INSERT INTO public.sales (
      first_name, 
      last_name, 
      email, 
      user_id, 
      administrator, 
      disabled
    )
    VALUES (
      user_first_name,
      user_last_name,
      new.email,
      new.id,
      CASE WHEN sales_count > 0 THEN FALSE ELSE TRUE END,
      FALSE
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE LOG 'handle_new_user: Failed to create sales record for user %: %', new.id, SQLERRM;
      -- Continue - user creation will succeed even if sales insert fails
  END;

  RETURN new;
END;
$$;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

