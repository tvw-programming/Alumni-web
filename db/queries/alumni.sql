-- Raw SQL for the alumni endpoints.
--
-- Kept as .sql next to the migrations rather than as Go string literals so the
-- plans can be checked with EXPLAIN against a real database without running the
-- API. internal/repository loads these by name at startup.
--
-- Two rules hold throughout:
--   * every query is parameterised - no identifier or value is ever formatted
--     into the text, including sort columns, which are mapped through a
--     whitelist in Go;
--   * list endpoints use keyset pagination, not OFFSET. OFFSET 10000 makes the
--     database walk and discard 10000 rows, and the cost grows with the page
--     number. A keyset carries the last row's sort key and seeks straight to it.

-- name: AlumniListKeyset
-- Directory listing, newest first, one page.
-- $1 filters by graduation year (NULL = any), $2 fuzzy-matches the name
-- (NULL = any), $3/$4 are the keyset cursor from the previous page's last row
-- (NULL on the first page), $5 is the page size.
SELECT
    p.id,
    p.full_name,
    p.headline,
    p.graduation_year,
    p.course,
    p.city,
    p.country,
    p.avatar_url,
    p.created_at,
    -- The current job, if any. LEFT JOIN LATERAL beats a correlated subquery
    -- per column: one index scan on professional_history serves both fields,
    -- and the planner keeps it a nested loop over the page's 20 rows rather
    -- than joining the whole table and discarding it.
    job.company    AS current_company,
    job.title      AS current_title,
    edu.institution AS primary_institution,
    edu.degree      AS primary_degree
FROM alumni_profiles p
LEFT JOIN LATERAL (
    SELECT company, title
    FROM professional_history
    WHERE alumni_id = p.id AND is_current
    ORDER BY started_on DESC
    LIMIT 1
) job ON TRUE
LEFT JOIN LATERAL (
    SELECT institution, degree
    FROM education_history
    WHERE alumni_id = p.id
    ORDER BY is_primary DESC, end_year DESC NULLS FIRST
    LIMIT 1
) edu ON TRUE
WHERE p.is_public
  AND p.status = 'active'
  AND ($1::SMALLINT IS NULL OR p.graduation_year = $1)
  AND ($2::TEXT     IS NULL OR p.full_name ILIKE '%' || $2 || '%')
  -- Row-value comparison, not (created_at < $3 OR (created_at = $3 AND id < $4)).
  -- The tuple form is what lets the planner use alumni_profiles_created_idx as
  -- a single range seek.
  AND ($3::TIMESTAMPTZ IS NULL OR (p.created_at, p.id) < ($3, $4::BIGINT))
ORDER BY p.created_at DESC, p.id DESC
LIMIT $5;

-- name: AlumniAdminSearch
-- The admin grid: every status, every visibility, server-side sort and filter.
-- $6 is a whitelisted sort key, mapped from the grid's column id in Go - never
-- interpolated. OFFSET is acceptable here and nowhere else: an admin jumping to
-- page 40 of a filtered result is a real interaction, and the filtered set is
-- small enough that the walk is cheap.
SELECT
    p.id, p.full_name, p.email, p.status, p.is_public,
    p.graduation_year, p.course, p.mobile, p.country, p.created_at, p.updated_at,
    COUNT(*) OVER () AS total_count,
    (SELECT COUNT(*) FROM media_gallery m
      WHERE m.alumni_id = p.id AND m.moderation_status = 'pending') AS pending_media
FROM alumni_profiles p
WHERE ($1::TEXT     IS NULL OR p.status = $1)
  AND ($2::SMALLINT IS NULL OR p.graduation_year = $2)
  AND ($3::TEXT     IS NULL OR p.country = $3)
  -- Course joins name and email in the quick filter: the admin screen's search
  -- box is one field, and "everyone who did B.Tech" is the query it is used for.
  AND ($4::TEXT     IS NULL OR p.full_name ILIKE '%' || $4 || '%'
                            OR p.email     ILIKE '%' || $4 || '%'
                            OR p.course    ILIKE '%' || $4 || '%')
ORDER BY
    CASE WHEN $6 = 'name_asc'   THEN p.full_name END ASC,
    CASE WHEN $6 = 'name_desc'  THEN p.full_name END DESC,
    CASE WHEN $6 = 'year_desc'  THEN p.graduation_year END DESC,
    p.created_at DESC, p.id DESC
LIMIT $5 OFFSET $7;

-- name: AlumniProfileFull
-- One profile with all three collections, as a single row of JSON.
--
-- The alternative is four round trips and a join that multiplies rows: a person
-- with 3 degrees, 4 jobs and 20 photos returns 240 rows to be de-duplicated in
-- Go. Aggregating to JSON in the database returns one row, and each subquery is
-- an index scan on its own table.
SELECT
    to_jsonb(p) - 'firebase_uid' AS profile,
    COALESCE((
        SELECT jsonb_agg(to_jsonb(e) ORDER BY e.is_primary DESC, e.end_year DESC NULLS FIRST)
        FROM education_history e WHERE e.alumni_id = p.id
    ), '[]'::JSONB) AS education,
    COALESCE((
        SELECT jsonb_agg(to_jsonb(w) ORDER BY w.is_current DESC, w.started_on DESC)
        FROM professional_history w WHERE w.alumni_id = p.id
    ), '[]'::JSONB) AS professional,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                   'id', m.id, 'object_path', m.object_path,
                   'content_type', m.content_type, 'caption', m.caption,
                   'width', m.width, 'height', m.height)
               ORDER BY m.position, m.id)
        FROM media_gallery m
        WHERE m.alumni_id = p.id AND m.moderation_status = 'approved'
    ), '[]'::JSONB) AS media
FROM alumni_profiles p
WHERE p.id = $1;

-- name: AlumniUpsertEducation
-- Replace one person's education in a single statement.
--
-- The form posts the whole list, so the write is a set difference, not a diff
-- computed in Go. Doing it as one statement means the profile is never briefly
-- missing a degree, which a DELETE-then-INSERT pair would allow a concurrent
-- reader to see.
WITH incoming AS (
    SELECT * FROM jsonb_to_recordset($2::JSONB) AS x(
        id BIGINT, institution TEXT, degree TEXT, field_of_study TEXT,
        start_year SMALLINT, end_year SMALLINT, grade TEXT, is_primary BOOLEAN
    )
),
removed AS (
    DELETE FROM education_history
    WHERE alumni_id = $1
      AND id NOT IN (SELECT id FROM incoming WHERE id IS NOT NULL)
    RETURNING id
)
INSERT INTO education_history AS e
    (id, alumni_id, institution, degree, field_of_study, start_year, end_year, grade, is_primary)
SELECT COALESCE(i.id, nextval('education_history_id_seq')), $1,
       i.institution, i.degree, i.field_of_study,
       i.start_year, i.end_year, i.grade, COALESCE(i.is_primary, FALSE)
FROM incoming i
ON CONFLICT (id) DO UPDATE SET
    institution    = EXCLUDED.institution,
    degree         = EXCLUDED.degree,
    field_of_study = EXCLUDED.field_of_study,
    start_year     = EXCLUDED.start_year,
    end_year       = EXCLUDED.end_year,
    grade          = EXCLUDED.grade,
    is_primary     = EXCLUDED.is_primary
RETURNING e.id;

-- name: MediaModerationQueue
-- What the admin panel drains, oldest first. Served entirely by the partial
-- index media_gallery_pending_idx.
SELECT m.id, m.alumni_id, m.object_path, m.content_type, m.caption,
       m.created_at, m.uploaded_at, p.full_name, p.email
FROM media_gallery m
JOIN alumni_profiles p ON p.id = m.alumni_id
WHERE m.moderation_status = 'pending'
  AND m.uploaded_at IS NOT NULL
ORDER BY m.created_at
LIMIT $1;

-- name: MediaMarkModerated
-- The only statement permitted to advance moderation_status.
--
-- The status guard in the WHERE clause makes the callback idempotent: Cloud
-- Vision may deliver the same result twice, and the second one must not
-- reopen a decision or overwrite a manual admin override.
UPDATE media_gallery
SET moderation_status    = $2,
    moderation_labels    = $3::JSONB,
    moderation_checked_at = NOW()
WHERE id = $1
  AND moderation_status = 'pending'
RETURNING id, alumni_id, moderation_status;
