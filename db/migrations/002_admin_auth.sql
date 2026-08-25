CREATE TABLE admin_credentials (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  password_iterations integer NOT NULL CHECK (password_iterations >= 100000),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_profiles_username_lower_unique
ON profiles (lower(username))
WHERE username IS NOT NULL;

CREATE INDEX idx_auth_sessions_profile
ON auth_sessions(profile_id);

CREATE INDEX idx_auth_sessions_expires
ON auth_sessions(expires_at);

INSERT INTO categories(name, description)
VALUES ('Umum', 'Kategori bawaan LENTERA POS')
ON CONFLICT (name) DO NOTHING;
