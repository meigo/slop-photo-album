-- CV shrinkdown: OpenCLIP is gone. Drop the dead tables that fed it.
DROP TABLE IF EXISTS image_embedding;
DROP TABLE IF EXISTS photo_tag;
