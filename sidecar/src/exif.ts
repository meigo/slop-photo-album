import { ExifTool } from 'exiftool-vendored';

let _exif: ExifTool | null = null;
function et(): ExifTool {
  if (!_exif) _exif = new ExifTool({ taskTimeoutMillis: 10_000 });
  return _exif;
}

export interface ExifResult {
  taken_at: string | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  exif_json: string | null;
}

export async function readExif(path: string): Promise<ExifResult> {
  const tags = await et().read(path);
  const taken =
    (tags.DateTimeOriginal as { toDate?: () => Date } | undefined)?.toDate?.() ??
    (tags.CreateDate as { toDate?: () => Date } | undefined)?.toDate?.() ??
    null;
  return {
    taken_at: taken ? taken.toISOString() : null,
    width: (tags.ImageWidth as number) ?? (tags.ExifImageWidth as number) ?? null,
    height: (tags.ImageHeight as number) ?? (tags.ExifImageHeight as number) ?? null,
    orientation: (tags.Orientation as number) ?? null,
    exif_json: JSON.stringify(tags),
  };
}

export async function closeExif(): Promise<void> {
  if (_exif) await _exif.end();
  _exif = null;
}
