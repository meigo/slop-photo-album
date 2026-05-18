-- Per-output slot corner radius. The album book and the wall calendar
-- can have different rounded-slot styling; backfilled from the existing
-- shared column so the calendar inherits whatever the project had set.
ALTER TABLE project ADD COLUMN calendar_slot_corner_radius_px INTEGER NOT NULL DEFAULT 0;
UPDATE project SET calendar_slot_corner_radius_px = slot_corner_radius_px;
