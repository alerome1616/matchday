-- Run as postgres in the Supabase SQL Editor after migration 003.
-- This test changes nothing and checks direct browser access is disabled.
begin;
do $$
begin
  if has_table_privilege('anon', 'public.user_api_credentials', 'SELECT')
    or has_table_privilege('authenticated', 'public.user_api_credentials', 'SELECT')
    or has_table_privilege('authenticated', 'public.user_api_credentials', 'INSERT')
    or has_table_privilege('authenticated', 'public.user_api_credentials', 'UPDATE')
    or has_table_privilege('authenticated', 'public.user_api_credentials', 'DELETE') then
    raise exception 'Browser roles must not access credentials';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.user_api_credentials'::regclass) then
    raise exception 'Credential RLS must be enabled';
  end if;
end;
$$;
rollback;
