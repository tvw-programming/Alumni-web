-- Authentication schema.
--
-- Three tables, and the split between them is the point:
--   users                 — identity and the password verifier
--   refresh_tokens        — long-lived sessions, one row per device
--   password_reset_tokens — single-use, short-lived reset grants
--
-- No table stores a secret it could hand back. Passwords are bcrypt verifiers;
-- both token tables store a SHA-256 of the token, never the token itself. A
-- dump of this database therefore cannot be replayed against the API.

-- Case-insensitive email without needing LOWER() on every lookup (which would
-- also defeat the unique index).
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    email          CITEXT      NOT NULL,
    -- bcrypt output is always 60 chars, but the column is wider so the hash
    -- algorithm can change without a migration of the column type.
    password_hash  VARCHAR(255) NOT NULL,
    display_name   VARCHAR(120) NOT NULL,
    -- Mirrors the frontends' capability table (core/auth/permissions.ts).
    role           VARCHAR(32)  NOT NULL DEFAULT 'user',
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Throttling state. Kept on the row rather than in memory so a restart or a
    -- second API replica cannot reset an attacker's budget.
    failed_login_attempts INTEGER     NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,

    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_role_valid   CHECK (role IN ('admin', 'user')),
    -- An empty email would pass NOT NULL and break every lookup silently.
    CONSTRAINT users_email_format CHECK (POSITION('@' IN email) > 1)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- SHA-256 hex of the opaque token. Unique so a collision is a hard error
    -- rather than two sessions quietly sharing a row.
    token_hash  CHAR(64)    NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    -- Recorded for the "sign out everywhere" view and incident review. Not used
    -- for authorization: both are attacker-controlled.
    user_agent  VARCHAR(255),
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

-- Every refresh does a lookup by hash; revocation sweeps by user.
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id);
-- Partial: expired and revoked rows are never selected, only deleted in bulk.
CREATE INDEX IF NOT EXISTS refresh_tokens_active_idx
    ON refresh_tokens (expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  CHAR(64)    NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT password_reset_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);

-- `updated_at` maintained by the database, so a writer that forgets to set it
-- cannot leave a stale value behind.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Seed accounts for local development.
--
-- The hash below is bcrypt(cost 12) of 'Password123!', generated and verified
-- rather than copied from anywhere. It is a *published*
-- credential in a file committed to the repository, so it is only ever
-- acceptable on a local database. `ops/deploy.sh` does not run db/init against
-- an existing volume, but treat these accounts as compromised anywhere real and
-- delete them before exposing an environment.
INSERT INTO users (email, password_hash, display_name, role)
SELECT seed.email, seed.hash, seed.display_name, seed.role
FROM (
    VALUES
        ('admin@gmail.com',
         '$2a$12$tA5TodHbCllq/IpxMySj3OThEkxCJYr4wxzvKzBM1./uG.TqZJJ9i',
         'Ada Admin', 'admin'),
        ('user@gmail.com',
         '$2a$12$tA5TodHbCllq/IpxMySj3OThEkxCJYr4wxzvKzBM1./uG.TqZJJ9i',
         'Sam User', 'user')
) AS seed(email, hash, display_name, role)
WHERE NOT EXISTS (SELECT 1 FROM users);
