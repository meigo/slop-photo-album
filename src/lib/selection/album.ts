import {
  listPhotos, listCvScoresByProject, listFacesByProject, listPersonClusters,
  listDuplicateMembersByPhoto, startSelection, insertSelectedPhoto, db,
} from '$lib/db';
import type { PhotoRow, FaceRow, PhotoTagRow } from '$lib/db/types';
import { aggregateScore } from './scoring';
import { ALBUM_DEFAULTS } from './constants';

/**
 * Album selection (chronological, day-bucketed).
 *
 * Algorithm:
 * 1. Load every photo + its CV / face / tag / dup-group context.
 * 2. Compute aggregate score per photo.
 * 3. Bucket by YYYY-MM-DD of taken_at. Photos without taken_at land in a
 *    'no-date' bucket at the end.
 * 4. Within each day-bucket, keep the top N (per_day_cap) by score.
 * 5. Materialize: write rows to selected_photo with rank within bucket.
 *
 * Returns the new selection.id.
 */
export async function generateAlbumSelection(projectId: number): Promise<number> {
  // Materialize all the per-photo context up front so we can compute
  // scores without round-tripping the DB per photo.
  const photos = await listPhotos(projectId);
  const cvScores = await listCvScoresByProject(projectId);
  const cvById = new Map(cvScores.map((c) => [c.photo_id, c]));
  const faces = await listFacesByProject(projectId);
  const facesByPhoto = new Map<number, FaceRow[]>();
  for (const f of faces) {
    const arr = facesByPhoto.get(f.photo_id) ?? [];
    arr.push(f);
    facesByPhoto.set(f.photo_id, arr);
  }
  const clusters = await listPersonClusters(projectId);
  const pinnedClusterIds = new Set<number>(
    clusters.filter((c) => c.is_pinned).map((c) => c.id)
  );
  const tags = await loadAllTagsAlbum(projectId);
  const dupGroupByPhoto = await listDuplicateMembersByPhoto(projectId);
  const dupReps = await loadDupRepsAlbum(projectId);
  const isNonRep = (photoId: number) => {
    const g = dupGroupByPhoto.get(photoId);
    if (g === undefined) return false;
    return dupReps.get(g) !== photoId;
  };

  // Score every photo.
  interface Scored {
    photo: PhotoRow;
    score: number;
  }
  const scored: Scored[] = photos.map((p) => ({
    photo: p,
    score: aggregateScore({
      cv: cvById.get(p.id),
      facesForPhoto: facesByPhoto.get(p.id) ?? [],
      pinnedClusterIds,
      tagsForPhoto: tags.get(p.id) ?? [],
      isDuplicateNonRep: isNonRep(p.id),
    }),
  }));

  // Bucket by day.
  const byDay = new Map<string, Scored[]>();
  for (const s of scored) {
    const key = s.photo.taken_at !== null ? dayKey(s.photo.taken_at) : 'no-date';
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }
  // Per-day: sort by score desc, keep top per_day_cap.
  const perDayKept: Scored[] = [];
  for (const [, items] of byDay) {
    items.sort((a, b) => b.score - a.score || a.photo.id - b.photo.id);
    for (let i = 0; i < Math.min(ALBUM_DEFAULTS.per_day_cap, items.length); i++) {
      perDayKept.push({ photo: items[i].photo, score: items[i].score });
    }
  }

  // Materialize. Group again by day, sort by score desc, write with rank.
  const selectionId = await startSelection(projectId, 'album');
  const byBucket = new Map<string, Scored[]>();
  for (const s of perDayKept) {
    const key = s.photo.taken_at !== null ? dayKey(s.photo.taken_at) : 'no-date';
    const arr = byBucket.get(key) ?? [];
    arr.push(s);
    byBucket.set(key, arr);
  }
  for (const [bucket, items] of byBucket) {
    items.sort((a, b) => b.score - a.score || a.photo.id - b.photo.id);
    for (let i = 0; i < items.length; i++) {
      await insertSelectedPhoto({
        selection_id: selectionId,
        photo_id: items[i].photo.id,
        bucket_key: bucket,
        rank: i,
        score: items[i].score,
      });
    }
  }

  return selectionId;
}

function dayKey(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function loadAllTagsAlbum(projectId: number): Promise<Map<number, PhotoTagRow[]>> {
  const d = await db();
  const rows = await d.select<PhotoTagRow[]>(
    `SELECT pt.* FROM photo_tag pt
     INNER JOIN photo p ON p.id = pt.photo_id
     WHERE p.project_id = ?`,
    [projectId]
  );
  const out = new Map<number, PhotoTagRow[]>();
  for (const r of rows) {
    const arr = out.get(r.photo_id) ?? [];
    arr.push(r);
    out.set(r.photo_id, arr);
  }
  return out;
}

async function loadDupRepsAlbum(projectId: number): Promise<Map<number, number>> {
  const d = await db();
  const rows = await d.select<{ id: number; representative_photo_id: number }[]>(
    'SELECT id, representative_photo_id FROM duplicate_group WHERE project_id = ?',
    [projectId]
  );
  return new Map(rows.map((r) => [r.id, r.representative_photo_id]));
}
