-- Comprehensive fix for handle_new_user trigger
-- Handles all edge cases including missing metadata

drop function if exists public.handle_new_user() cascade;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  sales_count int;
  user_first_name text;
  user_last_name text;
  email_prefix text;
begin
  -- Get count of existing sales records
  select count(id) into sales_count
  from public.sales;

  -- Extract email prefix (part before @) as fallback
  email_prefix := split_part(new.email, '@', 1);
  
  -- Extract first_name from metadata, with fallbacks
  user_first_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    email_prefix
  );
  
  -- Ensure first_name is never null or empty
  if user_first_name is null or length(user_first_name) = 0 then
    user_first_name := email_prefix;
  end if;
  
  -- Extract last_name from metadata, default to empty string
  user_last_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    ''
  );

  -- Insert into sales table
  insert into public.sales (first_name, last_name, email, user_id, administrator, disabled)
  values (
    user_first_name,
    user_last_name,
    new.email, 
    new.id, 
    case when sales_count > 0 then FALSE else TRUE end,
    FALSE
  );
  
  return new;
exception
  when others then
    -- Log detailed error information
    raise log 'ERROR in handle_new_user trigger:';
    raise log '  SQL State: %', SQLSTATE;
    raise log '  Error Message: %', SQLERRM;
    raise log '  User Email: %', new.email;
    raise log '  User ID: %', new.id;
    raise log '  First Name: %', user_first_name;
    raise log '  Last Name: %', user_last_name;
    raise log '  Metadata: %', new.raw_user_meta_data;
    -- Re-raise the error
    raise;
end;
$$;

-- Recreate the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

