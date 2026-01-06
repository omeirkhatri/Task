-- Final fix for handle_new_user trigger - ensures first_name is NEVER null
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

  -- Ensure email exists (should always be present, but be safe)
  if new.email is null or new.email = '' then
    raise exception 'Email is required for user creation';
  end if;

  -- Extract email prefix (part before @) - this will be our guaranteed fallback
  email_prefix := split_part(new.email, '@', 1);
  
  -- If email_prefix is somehow empty, use 'User' as absolute fallback
  if email_prefix is null or length(email_prefix) = 0 then
    email_prefix := 'User';
  end if;
  
  -- Extract first_name from metadata
  user_first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  
  -- If first_name is null or empty, use email prefix
  if user_first_name is null or length(user_first_name) = 0 then
    user_first_name := email_prefix;
  end if;
  
  -- Final safety check - ensure first_name is never null
  if user_first_name is null then
    user_first_name := 'User';
  end if;
  
  -- Extract last_name from metadata, default to empty string
  user_last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  if user_last_name is null then
    user_last_name := '';
  end if;

  -- Insert into sales table
  -- Explicitly check all values before insert
  if user_first_name is null or length(user_first_name) = 0 then
    raise exception 'first_name cannot be null or empty. Email: %, Prefix: %', new.email, email_prefix;
  end if;

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
    raise log '  First Name Value: %', user_first_name;
    raise log '  Last Name Value: %', user_last_name;
    raise log '  Email Prefix: %', email_prefix;
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

