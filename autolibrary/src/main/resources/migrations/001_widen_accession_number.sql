-- Migration 001 — widen book_copy.accession_number
--
-- NOT run automatically (ddl-auto=validate). Apply by hand against the
-- live database before deploying the code that accompanies it, then
-- restart the app so Hibernate's startup validation passes against the
-- new column length.
--
-- Why: the column only held 20 characters, enough for the generated
-- ACC-{detailsId}-{sequence} format but too narrow for hand-written
-- formats already in use at real schools (e.g. "LIB/2019/045"). The
-- UNIQUE constraint is preserved — accession numbers still identify one
-- physical copy and must never repeat.

ALTER TABLE book_copy MODIFY COLUMN accession_number VARCHAR(50);
