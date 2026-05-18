-- Cap on the number of pages the auto-assembler produces. NULL = use the
-- selection/constants.ts default (24). Surfaced on the project page so each
-- project can pick a target book size; the assembler packs photos to roughly
-- total_photos / max_pages slots per page, cycling through a varied template
-- rotation rather than producing one page per day.
ALTER TABLE project ADD COLUMN album_max_pages INTEGER;
