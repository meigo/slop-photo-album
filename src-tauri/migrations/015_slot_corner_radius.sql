-- Per-slot corner radius (px). Default 0 = square slots, square page —
-- correct for printed album previews and avoids the corner-cutoff
-- background bug (rounded surface-card masked slot content, exposing
-- the app's color in the cut-off area instead of the page bg).
-- Set > 0 to give individual slot images rounded corners; gaps between
-- rounded slots show the page background.
ALTER TABLE project ADD COLUMN slot_corner_radius_px INTEGER NOT NULL DEFAULT 0;
