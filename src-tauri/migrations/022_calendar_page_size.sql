-- Per-output paper size split. The existing page_size_w_mm /
-- page_size_h_mm continue to drive the album; new calendar-specific
-- columns let the wall calendar use a different aspect (typically
-- landscape) than a book-style album (typically square / portrait).
-- Backfilled from the album value so existing projects render
-- unchanged until the user opens calendar review and picks differently.
ALTER TABLE project ADD COLUMN calendar_page_size_w_mm INTEGER NOT NULL DEFAULT 297;
ALTER TABLE project ADD COLUMN calendar_page_size_h_mm INTEGER NOT NULL DEFAULT 210;
UPDATE project
SET calendar_page_size_w_mm = page_size_w_mm,
    calendar_page_size_h_mm = page_size_h_mm;
