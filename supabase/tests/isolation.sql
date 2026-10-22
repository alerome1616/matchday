-- Run in SQL Editor against a DEVELOPMENT project after the migration.
-- All test users and rows are rolled back. No existing rows are modified.
begin;
insert into auth.users(id,email) values
 ('a1111111-1111-4111-8111-111111111111','matchday-a@example.test'),
 ('b2222222-2222-4222-8222-222222222222','matchday-b@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select public.reserve_generation('d1111111-1111-4111-8111-111111111111');
insert into public.design_settings(user_id,settings) values(auth.uid(),'{"style":"minimal"}');
insert into public.generated_images(id,user_id,request_id,fixture,settings,prompt,storage_path)
 values('c1111111-1111-4111-8111-111111111111',auth.uid(),'d1111111-1111-4111-8111-111111111111','{}','{}','test','a1111111-1111-4111-8111-111111111111/test.png');
do $$ begin
 if (select count(*) from public.generated_images) <> 1 then raise exception 'Owner cannot read image'; end if;
 begin
  perform public.reserve_generation('d2222222-2222-4222-8222-222222222222');
  raise exception 'Active limit failed';
 exception when raise_exception then
  if sqlerrm <> 'active_limit' then raise; end if;
 end;
end; $$;
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.generated_images) then raise exception 'Cross-user image leak'; end if;
 if exists(select 1 from public.design_settings) then raise exception 'Cross-user settings leak'; end if;
 if exists(select 1 from public.generation_requests) then raise exception 'Cross-user request leak'; end if;
 begin
  insert into public.design_settings(user_id,settings) values('a1111111-1111-4111-8111-111111111111','{}');
  raise exception 'Cross-user insert unexpectedly allowed';
 exception when insufficient_privilege then null;
 end;
end; $$;
reset role;
rollback;
-- Success means all assertions completed without error. These checks require a live Supabase DB.
