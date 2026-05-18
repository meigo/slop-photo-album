-- Last-applied style preset id, so the project page dropdown can
-- show the active selection instead of resetting after every apply.
-- NULL = user hasn't applied a preset (or has tweaked fields
-- individually after applying one).
ALTER TABLE project ADD COLUMN style_preset_id TEXT;
