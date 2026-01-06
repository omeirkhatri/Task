-- Script to create sales record for a newly created auth user
-- Replace the email and names below

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'gagan@bestdochealthcare.ae';  -- Change this
  v_first_name TEXT := 'Gagan';                  -- Change this
  v_last_name TEXT := 'S';                       -- Change this
  v_is_admin BOOLEAN := FALSE;                   -- Change to TRUE if admin
BEGIN
  -- Find the user_id
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', v_email;
  END IF;
  
  -- Check if sales record already exists
  IF EXISTS (SELECT 1 FROM public.sales WHERE user_id = v_user_id) THEN
    RAISE NOTICE 'Sales record already exists for user %', v_email;
    -- Update existing record
    UPDATE public.sales
    SET 
      first_name = v_first_name,
      last_name = v_last_name,
      email = v_email
    WHERE user_id = v_user_id;
  ELSE
    -- Create new sales record
    INSERT INTO public.sales (
      first_name,
      last_name,
      email,
      user_id,
      administrator,
      disabled
    )
    VALUES (
      v_first_name,
      v_last_name,
      v_email,
      v_user_id,
      v_is_admin,
      FALSE
    );
    RAISE NOTICE 'Sales record created for user %', v_email;
  END IF;
END $$;

