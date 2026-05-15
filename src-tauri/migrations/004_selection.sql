-- One row per generated selection (album or calendar). Re-generating
-- creates a NEW selection row; old ones stay in the DB so the user can
-- compare versions. The most recent generation per (project, kind) is
-- the "current" one; older ones have is_current = 0.
CREATE TABLE selection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                  -- 'album' or 'calendar'
  generated_at INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_selection_project_kind_current ON selection (project_id, kind, is_current);

-- Ordered selection of photos within a selection. `bucket_key` is:
--   album:    ISO date 'YYYY-MM-DD' (the day the photo was taken)
--   calendar: 'YYYY-MM' (calendar month the photo will appear on)
-- `rank` is the order within the bucket (0 = best). `score` is the
-- aggregate score that put the photo here (kept for debugging / future
-- "show me alternatives" UX). `user_state` is for Phase 3b manual edits.
CREATE TABLE selected_photo (
  selection_id INTEGER NOT NULL REFERENCES selection(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  bucket_key TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score REAL,
  user_state TEXT NOT NULL DEFAULT 'auto',
  PRIMARY KEY (selection_id, photo_id)
);

CREATE INDEX idx_selected_photo_bucket ON selected_photo (selection_id, bucket_key, rank);
