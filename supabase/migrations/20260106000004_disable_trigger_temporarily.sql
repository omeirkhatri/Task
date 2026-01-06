-- TEMPORARY FIX: Disable trigger so users can be created
-- Then we'll fix the trigger properly

-- Drop the trigger completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Now users can be created without the trigger blocking them
-- The sales record will need to be created manually or via the edge function

