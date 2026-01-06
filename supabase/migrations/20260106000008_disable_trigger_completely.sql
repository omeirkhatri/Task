-- DISABLE TRIGGER COMPLETELY - Let edge function handle sales record creation
-- The edge function already has logic to create sales records manually

-- Drop trigger and function completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Now users can be created from Auth dashboard
-- Sales records will be created by the edge function when users are created via the app
-- For users created directly in Auth dashboard, you can manually create sales records if needed

