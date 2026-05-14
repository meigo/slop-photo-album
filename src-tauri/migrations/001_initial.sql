CREATE TABLE project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  source_dir TEXT NOT NULL,
  album_year INTEGER NOT NULL,
  calendar_year INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE photo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  taken_at INTEGER,
  width INTEGER,
  height INTEGER,
  orientation INTEGER,
  exif_json TEXT,
  thumb_path TEXT,
  indexed_at INTEGER NOT NULL,
  UNIQUE (project_id, sha256)
);

CREATE INDEX idx_photo_project_taken ON photo (project_id, taken_at);
