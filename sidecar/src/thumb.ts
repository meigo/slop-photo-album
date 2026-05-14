import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface ThumbResult {
  path: string;
  width: number;
  height: number;
}

export async function makeThumbnail(
  source: string,
  outPath: string,
  longestEdge: number
): Promise<ThumbResult> {
  await mkdir(dirname(outPath), { recursive: true });
  const img = sharp(source, { failOn: 'none' }).rotate(); // honor EXIF orientation
  const out = await img
    .resize(longestEdge, longestEdge, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(outPath);
  return { path: outPath, width: out.width, height: out.height };
}
