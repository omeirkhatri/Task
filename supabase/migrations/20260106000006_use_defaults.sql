-- COMPLETELY DIFFERENT APPROACH: Use DEFAULT values in table + simpler trigger

-- Step 1: Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Add DEFAULT values to the columns
ALTER TABLE public.sales 
  ALTER COLUMN first_name SET DEFAULT 'User',
  ALTER COLUMN last_name SET DEFAULT '';

-- Step 3: Update any existing NULL values
UPDATE public.sales 
SET 
  first_name = COALESCE(first_name, SPLIT_PART(email, '@', 1), 'User'),
  last_name = COALESCE(last_name, '')
WHERE first_name IS NULL OR last_name IS NULL;

-- Step 4: Create a MUCH simpler trigger that just sets administrator flag
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
  -- Get count
  SELECT COUNT(id) INTO sales_count FROM public.sales;

  -- Extract names from metadata or use defaults
  user_first_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'first_name'), ''),
    SPLIT_PART(new.email, '@', 1),
    'User'
  );
  
  user_last_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'last_name'), ''),
    ''
  );

  -- Insert - defaults will handle NULLs if somehow they're still null
  INSERT INTO public.sales (
    first_name,
    last_name,
    email,
    user_id,
    administrator,
    disabled
  )
  VALUES (
    COALESCE(user_first_name, 'User'),
    COALESCE(user_last_name, ''),
    new.email,
    new.id,
    CASE WHEN sales_count > 0 THEN FALSE ELSE TRUE END,
    FALSE
  );

  RETURN new;
END;
$$;

-- Step 5: Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

