-- CV shrinkdown: SFace face embeddings + clustering removed. Drop the
-- person_cluster table and the per-face columns it depended on.
-- ALTER TABLE DROP COLUMN requires SQLite >= 3.35 (March 2021); sqlx-sqlite
-- bundles a modern build.
DROP TABLE IF EXISTS person_cluster;
ALTER TABLE face DROP COLUMN cluster_id;
ALTER TABLE face DROP COLUMN embedding;
