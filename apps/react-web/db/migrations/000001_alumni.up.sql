-- Alumni Management — baseline schema.
--
-- Follows the conventions already set by libraries/archive/react-components/api:
-- golang-migrate pairs, TIMESTAMPTZ everywhere, CITEXT for anything compared
-- case-insensitively, named CHECK constraints so a violation names itself in
-- the error, and pg_trgm for the fuzzy search the admin grid needs.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- alumni_profiles — one row per person.
--
-- firebase_uid is the join to authentication and is the only identity the API
-- trusts: it comes from a verified ID token, never from a request body. It is
-- nullable because an admin can create a profile before that person has ever
-- signed in.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumni_profiles (
    id                BIGSERIAL PRIMARY KEY,
    firebase_uid      VARCHAR(128),
    email             CITEXT      NOT NULL,
    full_name         VARCHAR(160) NOT NULL,
    graduation_year   SMALLINT,
    headline          VARCHAR(240),
    bio               TEXT,
    country           VARCHAR(80),
    city              VARCHAR(120),
    avatar_url        TEXT,
    is_public         BOOLEAN     NOT NULL DEFAULT TRUE,
    status            VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT alumni_profiles_email_unique  UNIQUE (email),
    CONSTRAINT alumni_profiles_uid_unique    UNIQUE (firebase_uid),
    CONSTRAINT alumni_profiles_email_format  CHECK (POSITION('@' IN email) > 1),
    CONSTRAINT alumni_profiles_status_valid  CHECK (status IN ('active', 'suspended', 'deleted')),
    CONSTRAINT alumni_profiles_grad_year_sane
        CHECK (graduation_year IS NULL OR graduation_year BETWEEN 1900 AND 2100)
);

-- The admin grid's default sort. Descending id breaks ties so keyset pagination
-- is total: without it two profiles created in the same millisecond can be
-- returned in either order, and a page boundary between them drops or repeats.
CREATE INDEX IF NOT EXISTS alumni_profiles_created_idx
    ON alumni_profiles (created_at DESC, id DESC);

-- The public directory's default page: newest first, hidden rows excluded.
-- Ordered the way the query is ordered, which is the whole point — an index on
-- (graduation_year, id) filtered the same rows but left the planner sorting
-- them, because a keyset on created_at cannot seek through a graduation_year
-- index. EXPLAIN showed the Sort; this index removes it.
CREATE INDEX IF NOT EXISTS alumni_profiles_public_recent_idx
    ON alumni_profiles (created_at DESC, id DESC)
    WHERE is_public AND status = 'active';

-- The same slice by year, for the directory's year filter.
CREATE INDEX IF NOT EXISTS alumni_profiles_public_year_idx
    ON alumni_profiles (graduation_year DESC, created_at DESC, id DESC)
    WHERE is_public AND status = 'active';

-- Fuzzy name search for the admin quick-filter box.
CREATE INDEX IF NOT EXISTS alumni_profiles_name_trgm_idx
    ON alumni_profiles USING GIN (full_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- education_history — what the Education domain components read and write.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS education_history (
    id              BIGSERIAL PRIMARY KEY,
    alumni_id       BIGINT       NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    institution     VARCHAR(200) NOT NULL,
    degree          VARCHAR(120) NOT NULL,
    field_of_study  VARCHAR(160),
    start_year      SMALLINT     NOT NULL,
    end_year        SMALLINT,
    grade           VARCHAR(40),
    is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT education_years_ordered
        CHECK (end_year IS NULL OR end_year >= start_year),
    CONSTRAINT education_start_year_sane
        CHECK (start_year BETWEEN 1900 AND 2100)
);

CREATE INDEX IF NOT EXISTS education_history_alumni_idx
    ON education_history (alumni_id, end_year DESC NULLS FIRST);

-- "The" degree shown on a profile card. A partial unique index is what makes
-- "at most one primary per person" a database fact rather than a hope: two
-- concurrent transactions can both pass an application-level check.
CREATE UNIQUE INDEX IF NOT EXISTS education_history_one_primary_idx
    ON education_history (alumni_id) WHERE is_primary;

-- ---------------------------------------------------------------------------
-- professional_history — the Careers section.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS professional_history (
    id           BIGSERIAL PRIMARY KEY,
    alumni_id    BIGINT       NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    company      VARCHAR(200) NOT NULL,
    title        VARCHAR(160) NOT NULL,
    employment_type VARCHAR(32) NOT NULL DEFAULT 'full_time',
    location     VARCHAR(160),
    started_on   DATE         NOT NULL,
    ended_on     DATE,
    is_current   BOOLEAN      NOT NULL DEFAULT FALSE,
    description  TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT professional_dates_ordered
        CHECK (ended_on IS NULL OR ended_on >= started_on),
    CONSTRAINT professional_current_has_no_end
        CHECK (NOT is_current OR ended_on IS NULL),
    CONSTRAINT professional_employment_type_valid
        CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'self_employed'))
);

CREATE INDEX IF NOT EXISTS professional_history_alumni_idx
    ON professional_history (alumni_id, started_on DESC);

CREATE INDEX IF NOT EXISTS professional_history_company_trgm_idx
    ON professional_history USING GIN (company gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- media_gallery — uploads that reach Cloud Storage directly from the browser.
--
-- The row is created *before* the bytes exist: the client is handed a signed
-- URL for object_path and uploads to it, so the row is the record of what we
-- expect to arrive. moderation_status starts 'pending' and only the Vision
-- callback may advance it, which is why nothing else in the API is allowed to
-- write that column.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_gallery (
    id                  BIGSERIAL PRIMARY KEY,
    alumni_id           BIGINT       NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
    object_path         TEXT         NOT NULL,
    content_type        VARCHAR(120) NOT NULL,
    byte_size           BIGINT,
    width               INTEGER,
    height              INTEGER,
    caption             VARCHAR(280),
    position            INTEGER      NOT NULL DEFAULT 0,
    moderation_status   VARCHAR(24)  NOT NULL DEFAULT 'pending',
    moderation_labels   JSONB        NOT NULL DEFAULT '{}'::JSONB,
    moderation_checked_at TIMESTAMPTZ,
    uploaded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT media_gallery_object_unique UNIQUE (object_path),
    CONSTRAINT media_gallery_status_valid
        CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'failed')),
    CONSTRAINT media_gallery_type_valid
        CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4'))
);

-- The gallery's own query: one alumnus, approved only, in display order.
CREATE INDEX IF NOT EXISTS media_gallery_approved_idx
    ON media_gallery (alumni_id, position, id)
    WHERE moderation_status = 'approved';

-- The moderation queue the admin panel drains. Partial again — 'pending' is a
-- small slice of a table that only grows.
CREATE INDEX IF NOT EXISTS media_gallery_pending_idx
    ON media_gallery (created_at)
    WHERE moderation_status = 'pending';

-- ---------------------------------------------------------------------------
-- updated_at maintenance.
--
-- A trigger rather than application code: every one of these tables is written
-- by more than one path (REST handler, admin bulk action, the Vision callback),
-- and the column is only trustworthy if it cannot be forgotten.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['alumni_profiles', 'education_history',
                             'professional_history', 'media_gallery']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I_set_updated_at ON %I;
             CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
            t, t, t, t);
    END LOOP;
END $$;
