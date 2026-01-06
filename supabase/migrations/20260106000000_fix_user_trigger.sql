-- Fix handle_new_user trigger to handle missing first_name/last_name
-- This happens when users are created from Supabase Auth dashboard

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  sales_count int;
  user_first_name text;
  user_last_name text;
  email_parts text[];
begin
  select count(id) into sales_count
  from public.sales;

  -- Extract first_name and last_name from metadata, or derive from email
  user_first_name := coalesce(
    new.raw_user_meta_data ->> 'first_name',
    split_part(new.email, '@', 1)  -- Use email prefix as fallback
  );
  
  user_last_name := coalesce(
    new.raw_user_meta_data ->> 'last_name',
    ''  -- Empty string as fallback
  );

  -- Ensure we have at least something for first_name
  if user_first_name is null or user_first_name = '' then
    user_first_name := split_part(new.email, '@', 1);
  end if;

  insert into public.sales (first_name, last_name, email, user_id, administrator)
  values (
    user_first_name,
    coalesce(user_last_name, ''),
    new.email, 
    new.id, 
    case when sales_count > 0 then FALSE else TRUE end
  );
  return new;
exception
  when others then
    -- Log the error for debugging
    raise log 'Error in handle_new_user trigger: %', SQLERRM;
    raise log 'User email: %, User ID: %', new.email, new.id;
    raise log 'First name: %, Last name: %', user_first_name, user_last_name;
    -- Re-raise the error so it's visible
    raise;
end;
$$;

