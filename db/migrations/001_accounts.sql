BEGIN;
CREATE TABLE IF NOT EXISTS matchday_users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS matchday_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES matchday_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS matchday_sessions_user ON matchday_sessions(user_id);
CREATE INDEX IF NOT EXISTS matchday_sessions_expiry ON matchday_sessions(expires_at);
CREATE TABLE IF NOT EXISTS matchday_auth_limits (
  key_hash text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS matchday_credentials (
  user_id uuid PRIMARY KEY REFERENCES matchday_users(id) ON DELETE CASCADE,
  encrypted_key text NOT NULL, key_suffix text NOT NULL CHECK (length(key_suffix)=4),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS matchday_settings (
  user_id uuid PRIMARY KEY REFERENCES matchday_users(id) ON DELETE CASCADE, settings jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS matchday_generation_requests (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES matchday_users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matchday_requests_owner_date ON matchday_generation_requests(user_id,created_at);
CREATE TABLE IF NOT EXISTS matchday_images (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES matchday_users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE REFERENCES matchday_generation_requests(id),
  storage_path text NOT NULL UNIQUE, fixture jsonb NOT NULL, settings jsonb NOT NULL,
  prompt text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matchday_images_owner_date ON matchday_images(user_id,created_at DESC);
COMMIT;
