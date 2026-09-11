-- Mobile and course on the profile itself.
--
-- `course` duplicates what education_history already holds, and that is the
-- point. education_history stays the record of every qualification, with dates
-- and a primary flag; this column is the one course the admin grid lists, the
-- importer writes, and the completion percentage counts. Deriving it per row
-- meant a LATERAL join on every listing, and letting the grid edit a joined
-- value meant deciding which education row an edit belonged to.
--
-- The trade is a denormalisation that has to be kept honest: when the primary
-- education row changes, this column changes with it. The trigger below does
-- that, so the two cannot drift by way of the profile screen.

ALTER TABLE alumni_profiles
    ADD COLUMN IF NOT EXISTS mobile VARCHAR(24),
    ADD COLUMN IF NOT EXISTS course VARCHAR(160);

-- Same shape the browser enforces: 8-18 digits, optional leading +. Written as
-- a constraint because the importer and any future admin bulk action never
-- load that validator.
ALTER TABLE alumni_profiles
    DROP CONSTRAINT IF EXISTS alumni_profiles_mobile_format;
ALTER TABLE alumni_profiles
    ADD CONSTRAINT alumni_profiles_mobile_format
    CHECK (mobile IS NULL OR mobile ~ '^\+?[0-9][0-9 -]{7,17}$');

-- Admin search covers course, so it needs the same trigram index the name has.
CREATE INDEX IF NOT EXISTS alumni_profiles_course_trgm_idx
    ON alumni_profiles USING GIN (course gin_trgm_ops);

-- Finding everyone reachable by phone is a real query for an alumni office,
-- and partial keeps the index to the rows that answer it.
CREATE INDEX IF NOT EXISTS alumni_profiles_mobile_idx
    ON alumni_profiles (mobile)
    WHERE mobile IS NOT NULL;

-- Backfill from the education row already marked primary, so existing profiles
-- do not all read as incomplete the moment this ships.
UPDATE alumni_profiles p
SET course = e.degree
FROM education_history e
WHERE e.alumni_id = p.id
  AND e.is_primary
  AND p.course IS NULL;

-- ---------------------------------------------------------------------------
-- Keep the denormalised copy true.
--
-- Fires on the education row that claims to be primary. Without this the
-- profile keeps a course the person no longer holds after an edit made through
-- the education screen rather than the admin grid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_primary_course() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary THEN
        UPDATE alumni_profiles SET course = NEW.degree WHERE id = NEW.alumni_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS education_history_sync_course ON education_history;
CREATE TRIGGER education_history_sync_course
    AFTER INSERT OR UPDATE OF degree, is_primary ON education_history
    FOR EACH ROW EXECUTE FUNCTION sync_primary_course();
