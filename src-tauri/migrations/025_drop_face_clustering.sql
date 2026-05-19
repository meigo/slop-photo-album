-- CV shrinkdown: SFace face embeddings + clustering removed. Drop the
-- person_cluster table and the per-face columns it depended on.
--
-- ALTER TABLE DROP COLUMN can't be used here because (a) face.cluster_id
-- has an index AND a foreign key reference, both of which SQLite refuses
-- to drop a column under, and (b) we want to be defensive on
-- face.embedding too in case a future indexer hangs an index on it.
-- Rebuild via the standard "create new → INSERT SELECT → swap" pattern
-- (also handles the FK declaration disappearing cleanly).

DROP INDEX IF EXISTS idx_face_cluster;
DROP TABLE IF EXISTS person_cluster;

CREATE TABLE face_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  bbox_x INTEGER NOT NULL,
  bbox_y INTEGER NOT NULL,
  bbox_w INTEGER NOT NULL,
  bbox_h INTEGER NOT NULL,
  quality REAL,
  computed_at INTEGER NOT NULL
);

INSERT INTO face_new (id, photo_id, bbox_x, bbox_y, bbox_w, bbox_h, quality, computed_at)
  SELECT id, photo_id, bbox_x, bbox_y, bbox_w, bbox_h, quality, computed_at FROM face;

DROP TABLE face;
ALTER TABLE face_new RENAME TO face;
CREATE INDEX idx_face_photo ON face (photo_id);
