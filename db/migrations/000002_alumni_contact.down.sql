-- Reverse of 000002_alumni_contact.up.sql.
DROP TRIGGER IF EXISTS education_history_sync_course ON education_history;
DROP FUNCTION IF EXISTS sync_primary_course();

DROP INDEX IF EXISTS alumni_profiles_mobile_idx;
DROP INDEX IF EXISTS alumni_profiles_course_trgm_idx;

ALTER TABLE alumni_profiles DROP CONSTRAINT IF EXISTS alumni_profiles_mobile_format;
ALTER TABLE alumni_profiles
    DROP COLUMN IF EXISTS course,
    DROP COLUMN IF EXISTS mobile;
