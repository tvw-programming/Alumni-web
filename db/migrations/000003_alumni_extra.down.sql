-- Reverse of 000003_alumni_extra.up.sql. The normalisation is not reversed:
-- the original formatting is gone, and +91XXXXXXXXXX is the better value anyway.
DROP INDEX IF EXISTS alumni_profiles_mobile_lookup_idx;
CREATE INDEX IF NOT EXISTS alumni_profiles_mobile_idx
    ON alumni_profiles (mobile) WHERE mobile IS NOT NULL;

ALTER TABLE alumni_profiles DROP CONSTRAINT IF EXISTS alumni_profiles_mobile_format;
ALTER TABLE alumni_profiles
    ADD CONSTRAINT alumni_profiles_mobile_format
    CHECK (mobile IS NULL OR mobile ~ '^\+?[0-9][0-9 -]{7,17}$');

DROP INDEX IF EXISTS alumni_profiles_extra_idx;
ALTER TABLE alumni_profiles DROP CONSTRAINT IF EXISTS alumni_profiles_extra_is_object;
ALTER TABLE alumni_profiles DROP COLUMN IF EXISTS extra;
