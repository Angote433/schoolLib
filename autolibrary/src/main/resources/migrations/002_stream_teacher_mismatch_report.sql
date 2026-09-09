-- Migration 002 — stream <-> teacher dual foreign-key mismatch report
--
-- NOT run automatically. This is a read-only report, not a migration in
-- the schema-change sense — run it by hand to find rows where
-- stream.teacher_id and user_details.stream_id disagree, before and
-- after deploying the Feature 3 changes, to confirm nothing is stale.
--
-- Why two columns can disagree: stream.teacher_id (who manages the
-- stream) and user_details.stream_id (which stream the teacher belongs
-- to, read at login) describe the same relationship from both ends.
-- Before this fix, at least one write path could update one side
-- without the other. stream.teacher_id is the source of truth — see
-- StreamService.assignTeacher, now the only method that writes either
-- column.

-- 1) Streams whose teacher_id points at a user who doesn't point back.
SELECT
    s.stream_id,
    s.stream_name,
    s.teacher_id                 AS stream_says_teacher_id,
    u.stream_id                  AS that_teachers_stream_id,
    u.user_name                  AS that_teachers_user_name
FROM stream s
JOIN user_details u ON u.user_id = s.teacher_id
WHERE s.teacher_id IS NOT NULL
  AND (u.stream_id IS NULL OR u.stream_id <> s.stream_id);

-- 2) Teachers whose stream_id points at a stream that doesn't point back.
SELECT
    u.user_id,
    u.user_name,
    u.stream_id                  AS teacher_says_stream_id,
    s.teacher_id                 AS that_streams_teacher_id
FROM user_details u
JOIN stream s ON s.stream_id = u.stream_id
WHERE u.role = 'TEACHER'
  AND u.stream_id IS NOT NULL
  AND (s.teacher_id IS NULL OR s.teacher_id <> u.user_id);

-- To correct a mismatch found above, make stream.teacher_id the source
-- of truth and re-point the teacher's row at it (or clear it, if the
-- stream no longer claims that teacher):
--
-- UPDATE user_details u
-- JOIN stream s ON s.teacher_id = u.user_id
-- SET u.stream_id = s.stream_id
-- WHERE u.user_id = <teacher_id_from_query_1>;
