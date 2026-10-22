begin;
-- Only the backend service client can access ciphertext or metadata.
create table public.user_api_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_key text not null check (length(encrypted_key) <= 2048),
  key_suffix text not null check (length(key_suffix) = 4),
  updated_at timestamptz not null default now()
);
alter table public.user_api_credentials enable row level security;
revoke all on public.user_api_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.user_api_credentials to service_role;
-- No browser policy: requests must go through the authenticated backend.
commit;
