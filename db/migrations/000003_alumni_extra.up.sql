-- Indian mobile numbers, and a home for everything that is not a column.

-- ---------------------------------------------------------------------------
-- extra: whatever this institution tracks that the schema does not.
--
-- Every alumni office wants a field nobody anticipated — batch section, hostel,
-- donor tier, the year they last attended a reunion. Adding a column per
-- request means a migration per request; refusing them means the data lands in
-- the headline field instead. JSONB takes them without either.
--
-- What does NOT belong here: anything queried in a WHERE clause across the whole
-- table, or anything the completion percentage counts. Those earn a column.
-- ---------------------------------------------------------------------------
ALTER TABLE alumni_profiles
    ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::JSONB;

-- An object, not an array or a bare scalar: the importer writes header/value
-- pairs, and code that reads extra->>'hostel' should never meet a list.
ALTER TABLE alumni_profiles
    DROP CONSTRAINT IF EXISTS alumni_profiles_extra_is_object;
ALTER TABLE alumni_profiles
    ADD CONSTRAINT alumni_profiles_extra_is_object
    CHECK (jsonb_typeof(extra) = 'object');

-- jsonb_path_ops rather than the default: it indexes only containment (@>),
-- which is the one operator an admin filter needs, and builds an index roughly
-- a third the size of the general one.
CREATE INDEX IF NOT EXISTS alumni_profiles_extra_idx
    ON alumni_profiles USING GIN (extra jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- Indian mobile numbers.
--
-- Ten digits beginning 6, 7, 8 or 9 — the TRAI allocation. Stored canonically
-- as +91XXXXXXXXXX so that two people who typed "98765 43210" and "+91-98765-
-- 43210" are one number when compared, and a uniqueness check or a bulk SMS
-- export does not see them as different.
--
-- Existing rows are normalised before the constraint tightens, or the ALTER
-- fails on data this migration itself put there.
-- ---------------------------------------------------------------------------
UPDATE alumni_profiles
SET mobile = '+91' || RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g'), 10)
WHERE mobile IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g')) >= 10;

-- Anything that could not be salvaged is cleared rather than left to fail the
-- constraint: a nine-digit fragment is not a phone number, and keeping it would
-- block every later write to that row.
UPDATE alumni_profiles
SET mobile = NULL
WHERE mobile IS NOT NULL
  AND mobile !~ '^\+91[6-9][0-9]{9}$';

ALTER TABLE alumni_profiles
    DROP CONSTRAINT IF EXISTS alumni_profiles_mobile_format;
ALTER TABLE alumni_profiles
    ADD CONSTRAINT alumni_profiles_mobile_format
    CHECK (mobile IS NULL OR mobile ~ '^\+91[6-9][0-9]{9}$');

-- Finding a person by the number they gave over the phone. Unique would be
-- wrong: a shared family number is real, and a duplicate should be a report for
-- staff to look at, not a write that fails.
CREATE INDEX IF NOT EXISTS alumni_profiles_mobile_lookup_idx
    ON alumni_profiles (mobile)
    WHERE mobile IS NOT NULL;
DROP INDEX IF EXISTS alumni_profiles_mobile_idx;
