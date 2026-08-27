-- Reverse of 000001_alumni.up.sql. Dropped child-first so the FKs go quietly.
DROP TRIGGER IF EXISTS media_gallery_set_updated_at        ON media_gallery;
DROP TRIGGER IF EXISTS professional_history_set_updated_at ON professional_history;
DROP TRIGGER IF EXISTS education_history_set_updated_at    ON education_history;
DROP TRIGGER IF EXISTS alumni_profiles_set_updated_at      ON alumni_profiles;

DROP TABLE IF EXISTS media_gallery;
DROP TABLE IF EXISTS professional_history;
DROP TABLE IF EXISTS education_history;
DROP TABLE IF EXISTS alumni_profiles;

-- set_updated_at() is left in place: it is shared plumbing, and a later
-- migration may already depend on it.
