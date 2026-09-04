ALTER TABLE products ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_version_positive'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_version_positive CHECK (version > 0);
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS audit_events (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(120),
    request_id TEXT,
    ip_address INET,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_created_idx
    ON audit_events (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_resource_created_idx
    ON audit_events (resource_type, resource_id, created_at DESC);

CREATE TABLE IF NOT EXISTS idempotency_records (
    id BIGSERIAL PRIMARY KEY,
    scope VARCHAR(160) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'processing',
    response_status INTEGER,
    response_content_type TEXT,
    response_etag TEXT,
    response_body BYTEA,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT idempotency_records_scope_key_unique UNIQUE (scope, idempotency_key),
    CONSTRAINT idempotency_records_state_valid CHECK (state IN ('processing', 'complete'))
);

CREATE INDEX IF NOT EXISTS idempotency_records_expiry_idx
    ON idempotency_records (expires_at);

CREATE TABLE IF NOT EXISTS background_jobs (
    id BIGSERIAL PRIMARY KEY,
    kind VARCHAR(100) NOT NULL,
    unique_key VARCHAR(160),
    payload JSONB NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(120),
    last_error TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT background_jobs_state_valid
        CHECK (state IN ('pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS background_jobs_runnable_idx
    ON background_jobs (run_at, id) WHERE state = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS background_jobs_active_unique_idx
    ON background_jobs (unique_key)
    WHERE unique_key IS NOT NULL AND state IN ('pending', 'running');

DROP TRIGGER IF EXISTS idempotency_records_set_updated_at ON idempotency_records;
CREATE TRIGGER idempotency_records_set_updated_at
    BEFORE UPDATE ON idempotency_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS background_jobs_set_updated_at ON background_jobs;
CREATE TRIGGER background_jobs_set_updated_at
    BEFORE UPDATE ON background_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
