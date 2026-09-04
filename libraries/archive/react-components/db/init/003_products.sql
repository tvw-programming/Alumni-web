-- Products.
--
-- Columns are derived one-for-one from the schema-demo form
-- (`frontend/react/src/schemas/productSchema.json`), which is the contract the
-- two frontends already render. Where the form says "one of these options", the
-- database says CHECK — the form can be edited by anyone with the file, the
-- constraint cannot.
--
-- Types are chosen for what the data *is*, not for what is convenient:
--   * price is NUMERIC, never FLOAT — binary floating point cannot represent
--     19.99, and money that does not add up is the classic version of this bug.
--   * multi-select fields are TEXT[] rather than a comma-joined string, so they
--     can be queried with array operators and indexed with GIN.
--   * uploads store a *path*, never the bytes. Postgres is not a file server.

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,

    -- Business key from the form. Distinct from `id`: users type this one.
    product_id    VARCHAR(15)  NOT NULL,
    product_name  VARCHAR(100) NOT NULL,
    description   VARCHAR(500) NOT NULL,
    price         NUMERIC(12, 2) NOT NULL,
    rating        SMALLINT     NOT NULL DEFAULT 0,

    -- Upload targets. Paths under the configured upload root.
    product_image_path     TEXT,
    product_document_paths TEXT[] NOT NULL DEFAULT '{}',

    comments      TEXT,
    release_date  DATE         NOT NULL,
    support_email CITEXT,
    support_phone VARCHAR(32),
    product_url   TEXT,
    theme_color   VARCHAR(9),

    condition     VARCHAR(16)  NOT NULL,
    availability  VARCHAR(16)  NOT NULL DEFAULT 'inStock',
    tags             TEXT[]    NOT NULL DEFAULT '{}',
    shipping_regions TEXT[]    NOT NULL,

    warranty_months SMALLINT   NOT NULL DEFAULT 0,
    is_published    BOOLEAN    NOT NULL DEFAULT FALSE,
    accept_terms    BOOLEAN    NOT NULL DEFAULT FALSE,
    category        VARCHAR(32) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT products_product_id_unique UNIQUE (product_id),

    -- The form's `minLength`/`maxLength` restated where they are actually
    -- enforceable. A client-side rule is a courtesy; this is the guarantee.
    CONSTRAINT products_product_id_len   CHECK (char_length(product_id) BETWEEN 3 AND 15),
    CONSTRAINT products_product_name_len CHECK (char_length(product_name) >= 2),
    CONSTRAINT products_price_positive   CHECK (price >= 0),
    CONSTRAINT products_rating_range     CHECK (rating BETWEEN 0 AND 5),
    CONSTRAINT products_warranty_range   CHECK (warranty_months BETWEEN 0 AND 120),

    CONSTRAINT products_condition_valid
        CHECK (condition IN ('new', 'refurbished', 'used')),
    CONSTRAINT products_availability_valid
        CHECK (availability IN ('inStock', 'preorder', 'discontinued')),
    CONSTRAINT products_category_valid
        CHECK (category IN ('electronics', 'clothing', 'books', 'home')),

    -- The form marks shippingRegions required; empty would satisfy NOT NULL.
    CONSTRAINT products_shipping_regions_present
        CHECK (cardinality(shipping_regions) > 0),

    -- The form's acceptTerms checkbox is required, so a stored row that never
    -- accepted them is a bug rather than a state to handle.
    CONSTRAINT products_terms_accepted CHECK (accept_terms)
);

-- Indexes.
--
-- Listing is the hot path and it orders by `created_at DESC, id DESC`. The
-- index carries both columns in that exact order so the sort is satisfied by a
-- scan, and so keyset pagination ("everything after this row") is a range seek
-- rather than a growing OFFSET.
CREATE INDEX IF NOT EXISTS products_created_at_id_idx
    ON products (created_at DESC, id DESC);

-- The filters the list endpoint accepts.
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_published_idx
    ON products (is_published)
    WHERE is_published;

-- GIN for array containment: "products tagged eco", "ships to apac".
CREATE INDEX IF NOT EXISTS products_tags_gin ON products USING GIN (tags);
CREATE INDEX IF NOT EXISTS products_shipping_regions_gin ON products USING GIN (shipping_regions);

-- Free-text search over the two fields a person would actually search.
-- `pg_trgm` handles partial words, which plain to_tsvector does not.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS products_name_trgm_idx
    ON products USING GIN (product_name gin_trgm_ops);

-- Reuses the trigger function defined in 002_auth.sql.
DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- A handful of rows so the grid is not empty on a fresh volume.
INSERT INTO products (
    product_id, product_name, description, price, rating, release_date,
    support_email, condition, availability, tags, shipping_regions,
    warranty_months, is_published, accept_terms, category, theme_color
)
SELECT * FROM (
    VALUES
        ('SKU-1001', 'Aurora Wireless Keyboard',
         'Low-profile mechanical keyboard with a two-year battery.',
         129.99::numeric, 5::smallint, DATE '2025-02-14',
         'support@idol-promo.test'::citext, 'new', 'inStock',
         ARRAY['bestseller', 'eco'], ARRAY['na', 'eu'],
         24::smallint, TRUE, TRUE, 'electronics', '#4f8cc9'),
        ('SKU-1002', 'Meridian Desk Lamp',
         'Warm-to-cool dimmable lamp with a weighted base.',
         79.50::numeric, 4::smallint, DATE '2025-05-02',
         'support@idol-promo.test'::citext, 'new', 'preorder',
         ARRAY['sale'], ARRAY['na', 'eu', 'apac'],
         12::smallint, TRUE, TRUE, 'home', '#e8833a'),
        ('SKU-1003', 'Field Notes Hardback',
         'A5 hardback notebook, 200 numbered pages.',
         18.00::numeric, 4::smallint, DATE '2024-11-20',
         NULL::citext, 'new', 'inStock',
         ARRAY['eco'], ARRAY['na'],
         0::smallint, FALSE, TRUE, 'books', '#54b567'),
        ('SKU-1004', 'Trail Shell Jacket',
         'Three-layer waterproof shell with taped seams.',
         240.00::numeric, 5::smallint, DATE '2025-08-01',
         NULL::citext, 'refurbished', 'discontinued',
         ARRAY['limited'], ARRAY['eu', 'latam'],
         36::smallint, TRUE, TRUE, 'clothing', '#8a6ec4')
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM products);
