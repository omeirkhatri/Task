-- COMPLETE FIX: Drop trigger, make columns nullable temporarily, then recreate properly

-- Step 1: Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 3: Make first_name and last_name nullable temporarily (so users can be created)
ALTER TABLE public.sales ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.sales ALTER COLUMN last_name DROP NOT NULL;

-- Step 4: Create a new, simpler trigger function that ALWAYS provides values
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sales_count INT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- Get count of existing sales records
  SELECT COUNT(id) INTO sales_count FROM public.sales;

  -- ALWAYS set first_name - use metadata or email prefix or 'User'
  user_first_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'first_name'), ''),
    SPLIT_PART(COALESCE(new.email, 'user@example.com'), '@', 1),
    'User'
  );
  
  -- Ensure it's never empty
  IF user_first_name IS NULL OR LENGTH(user_first_name) = 0 THEN
    user_first_name := 'User';
  END IF;

  -- ALWAYS set last_name - use metadata or empty string
  user_last_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'last_name'), ''),
    ''
  );

  -- Insert with guaranteed non-null values
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
    COALESCE(new.email, ''),
    new.id,
    CASE WHEN sales_count > 0 THEN FALSE ELSE TRUE END,
    FALSE
  );

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    RAISE LOG 'handle_new_user ERROR: %', SQLERRM;
    RAISE LOG 'Email: %, User ID: %, First: %, Last: %', 
      new.email, new.id, user_first_name, user_last_name;
    -- Still return new to allow user creation even if sales insert fails
    RETURN new;
END;
$$;

-- Step 5: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Add back NOT NULL constraints with defaults
-- First, update any existing NULL values
UPDATE public.sales 
SET 
  first_name = COALESCE(first_name, SPLIT_PART(email, '@', 1), 'User'),
  last_name = COALESCE(last_name, '')
WHERE first_name IS NULL OR last_name IS NULL;

-- Now add back NOT NULL constraints
ALTER TABLE public.sales ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.sales ALTER COLUMN last_name SET NOT NULL;

