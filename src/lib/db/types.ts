export interface ProjectRow {
  id: number;
  name: string;
  source_dir: string;
  album_year: number;
  calendar_year: number;
  created_at: number;
}

export interface PhotoRow {
  id: number;
  project_id: number;
  path: string;
  sha256: string;
  taken_at: number | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  exif_json: string | null;
  thumb_path: string | null;
  indexed_at: number;
}

export interface PhotoInsert {
  project_id: number;
  path: string;
  sha256: string;
  taken_at: number | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  exif_json: string | null;
  thumb_path: string | null;
  indexed_at: number;
}

export interface CvScoreRow {
  photo_id: number;
  blur: number | null;
  faces_count: number | null;
  faces_json: string | null;
  phash: string | null;
  computed_at: number;
}

export interface CvScoreInsert {
  photo_id: number;
  blur: number | null;
  faces_count: number | null;
  faces_json: string | null;
  phash: string | null;
  computed_at: number;
}

export interface DuplicateGroupRow {
  id: number;
  project_id: number;
  representative_photo_id: number;
  created_at: number;
}
