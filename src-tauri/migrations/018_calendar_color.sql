-- Per-project calendar grid foreground color (heading, day headers, date
-- numbers, cell borders). Default black; pair with a dark page background
-- via a style preset that sets both to keep the grid readable.
ALTER TABLE project ADD COLUMN calendar_color TEXT NOT NULL DEFAULT '#000000';
