CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email CITEXT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_role_valid CHECK (role IN ('admin', 'user')),
    CONSTRAINT users_email_format CHECK (POSITION('@' IN email) > 1)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_active_idx
    ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT password_reset_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
    ON password_reset_tokens (user_id);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(15) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    rating SMALLINT NOT NULL DEFAULT 0,
    product_image_path TEXT,
    product_document_paths TEXT[] NOT NULL DEFAULT '{}',
    comments TEXT,
    release_date DATE NOT NULL,
    support_email CITEXT,
    support_phone VARCHAR(32),
    product_url TEXT,
    theme_color VARCHAR(9),
    condition VARCHAR(16) NOT NULL,
    availability VARCHAR(16) NOT NULL DEFAULT 'inStock',
    tags TEXT[] NOT NULL DEFAULT '{}',
    shipping_regions TEXT[] NOT NULL,
    warranty_months SMALLINT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    accept_terms BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(32) NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT products_product_id_unique UNIQUE (product_id),
    CONSTRAINT products_product_id_len CHECK (char_length(product_id) BETWEEN 3 AND 15),
    CONSTRAINT products_product_name_len CHECK (char_length(product_name) >= 2),
    CONSTRAINT products_price_positive CHECK (price >= 0),
    CONSTRAINT products_rating_range CHECK (rating BETWEEN 0 AND 5),
    CONSTRAINT products_warranty_range CHECK (warranty_months BETWEEN 0 AND 120),
    CONSTRAINT products_condition_valid CHECK (condition IN ('new', 'refurbished', 'used')),
    CONSTRAINT products_availability_valid CHECK (availability IN ('inStock', 'preorder', 'discontinued')),
    CONSTRAINT products_category_valid CHECK (category IN ('electronics', 'clothing', 'books', 'home')),
    CONSTRAINT products_shipping_regions_present CHECK (cardinality(shipping_regions) > 0),
    CONSTRAINT products_terms_accepted CHECK (accept_terms),
    CONSTRAINT products_version_positive CHECK (version > 0)
);

CREATE INDEX IF NOT EXISTS products_created_at_id_idx
    ON products (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_published_idx
    ON products (is_published) WHERE is_published;
CREATE INDEX IF NOT EXISTS products_tags_gin ON products USING GIN (tags);
CREATE INDEX IF NOT EXISTS products_shipping_regions_gin
    ON products USING GIN (shipping_regions);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx
    ON products USING GIN (product_name gin_trgm_ops);

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
