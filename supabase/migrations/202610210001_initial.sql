-- Matchday Studio. Run once with Supabase CLI or SQL Editor.
begin;
create table public.design_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 settings jsonb not null,
 updated_at timestamptz not null default now(),
 constraint settings_object check (jsonb_typeof(settings) = 'object')
);
create table public.generation_requests (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','succeeded','failed')),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 unique(id,user_id)
);
create index generation_requests_user_created on public.generation_requests(user_id,created_at desc);
create table public.generated_images (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null unique,
 fixture jsonb not null,
 settings jsonb not null,
 prompt text not null check (length(prompt) <= 6000),
 storage_path text not null unique,
 demo boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key(request_id,user_id) references public.generation_requests(id,user_id) on delete cascade,
 constraint own_storage_path check (split_part(storage_path,'/',1)=user_id::text)
);
create index generated_images_user_created on public.generated_images(user_id,created_at desc);
alter table public.design_settings enable row level security;
alter table public.generation_requests enable row level security;
alter table public.generated_images enable row level security;
create policy "Read own settings" on public.design_settings for select to authenticated using ((select auth.uid())=user_id);
create policy "Insert own settings" on public.design_settings for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Update own settings" on public.design_settings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Read own requests" on public.generation_requests for select to authenticated using ((select auth.uid())=user_id);
create policy "Complete own requests" on public.generation_requests for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Read own images" on public.generated_images for select to authenticated using ((select auth.uid())=user_id);
create policy "Insert own images" on public.generated_images for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Delete own images" on public.generated_images for delete to authenticated using ((select auth.uid())=user_id);
-- Requests can only be reserved through the RPC. Ownership and creation time cannot be edited.
revoke all on public.generation_requests from anon,authenticated;
grant select on public.generation_requests to authenticated;
grant update(status,finished_at) on public.generation_requests to authenticated;
grant select,insert,update on public.design_settings to authenticated;
grant select,insert,delete on public.generated_images to authenticated;
-- Atomic per-user quota and a single active generation, shared by all server instances.
create function public.reserve_generation(p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'unauthorized'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 if exists(select 1 from public.generation_requests where id=p_request_id) then raise exception 'duplicate_request'; end if;
 if (select count(*) from public.generation_requests where user_id=v_user and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= 20 then raise exception 'daily_limit'; end if;
 if exists(select 1 from public.generation_requests where user_id=v_user and status='pending' and created_at>now()-interval '10 minutes') then raise exception 'active_limit'; end if;
 insert into public.generation_requests(id,user_id) values(p_request_id,v_user);
end;
$$;
revoke all on function public.reserve_generation(uuid) from public;
grant execute on function public.reserve_generation(uuid) to authenticated;
-- Private bucket. Signed links expire after one hour. No service-role key is needed.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('match-images','match-images',false,20971520,array['image/png','image/svg+xml'])
 on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=array['image/png','image/svg+xml'];
create policy "Read own design files" on storage.objects for select to authenticated
 using(bucket_id='match-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Upload own design files" on storage.objects for insert to authenticated
 with check(bucket_id='match-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Delete own design files" on storage.objects for delete to authenticated
 using(bucket_id='match-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
