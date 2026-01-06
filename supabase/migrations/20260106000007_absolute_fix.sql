-- ABSOLUTE FIX: Verify trigger exists and create bulletproof version

-- Step 1: Check if trigger exists and drop it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users CASCADE;
    RAISE NOTICE 'Dropped existing trigger';
  END IF;
END $$;

-- Step 2: Drop function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 3: Create the most robust function possible
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sales_count INT;
  fn_first_name TEXT;
  fn_last_name TEXT;
  fn_email TEXT;
  fn_user_id UUID;
BEGIN
  -- Set variables with absolute guarantees
  fn_email := COALESCE(new.email, '');
  fn_user_id := new.id;
  
  -- Get sales count
  BEGIN
    SELECT COUNT(*) INTO sales_count FROM sales;
  EXCEPTION WHEN OTHERS THEN
    sales_count := 0;
  END;

  -- Determine first_name with multiple fallbacks
  fn_first_name := 'User'; -- Default
  
  IF fn_email != '' THEN
    fn_first_name := SPLIT_PART(fn_email, '@', 1);
    IF fn_first_name IS NULL OR fn_first_name = '' THEN
      fn_first_name := 'User';
    END IF;
  END IF;
  
  IF new.raw_user_meta_data IS NOT NULL 
     AND new.raw_user_meta_data ? 'first_name' 
     AND new.raw_user_meta_data->>'first_name' IS NOT NULL THEN
    fn_first_name := TRIM(new.raw_user_meta_data->>'first_name');
    IF fn_first_name IS NULL OR fn_first_name = '' THEN
      fn_first_name := 'User';
    END IF;
  END IF;

  -- Determine last_name
  fn_last_name := '';
  IF new.raw_user_meta_data IS NOT NULL 
     AND new.raw_user_meta_data ? 'last_name' 
     AND new.raw_user_meta_data->>'last_name' IS NOT NULL THEN
    fn_last_name := TRIM(new.raw_user_meta_data->>'last_name');
    IF fn_last_name IS NULL THEN
      fn_last_name := '';
    END IF;
  END IF;

  -- Final NULL checks
  fn_first_name := COALESCE(NULLIF(fn_first_name, ''), 'User');
  fn_last_name := COALESCE(fn_last_name, '');

  -- Insert the record
  INSERT INTO sales (
    first_name,
    last_name,
    email,
    user_id,
    administrator,
    disabled
  )
  VALUES (
    fn_first_name,
    fn_last_name,
    fn_email,
    fn_user_id,
    CASE WHEN sales_count > 0 THEN FALSE ELSE TRUE END,
    FALSE
  );

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'handle_new_user failed: %, Email: %, User ID: %, First: %, Last: %', 
      SQLERRM, fn_email, fn_user_id, fn_first_name, fn_last_name;
    RETURN new; -- Always return new to allow user creation
END;
$$;

-- Step 4: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify trigger was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE NOTICE 'Trigger created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger';
  END IF;
END $$;

