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
