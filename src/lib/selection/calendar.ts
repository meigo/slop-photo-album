import {
  listPhotos, listCvScoresByProject, listFacesByProject, listPersonClusters,
  listDuplicateMembersByPhoto, getProject,
  startSelection, insertSelectedPhoto, db,
} from '$lib/db';
import type { PhotoRow, FaceRow, PhotoTagRow } from '$lib/db/types';
import { aggregateScore } from './scoring';
import { CALENDAR_DEFAULTS } from './constants';

/**
 * Calendar selection — seasonal-memory mode.
 *
 * For each calendar month M of project.calendar_year:
 *   1. Pull photos with taken_at.year == calendar_year - 1 AND
 *      taken_at.month == M.
 *   2. If empty and empty_month_fallback === 'adjacent', try M-1
 *      then M+1 (same source year). Photos from a fallback month
 *      get a notes annotation.
 *   3. Score them via aggregateScore.
 *   4. Take top photos_per_month by score.
 *   5. Materialize as selected_photo rows with bucket_key = 'YYYY-MM'.
 *
 * Returns the new selection.id.
 */
export async function generateCalendarSelection(projectId: number): Promise<number> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);
  const sourceYear = project.calendar_year - 1;
  const targetYear = project.calendar_year;

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
  const tags = await loadAllTagsCalendar(projectId);
  const dupGroupByPhoto = await listDuplicateMembersByPhoto(projectId);
  const dupReps = await loadDupRepsCalendar(projectId);
  const isNonRep = (photoId: number) => {
    const g = dupGroupByPhoto.get(photoId);
    if (g === undefined) return false;
    return dupReps.get(g) !== photoId;
  };

  // Bucket source-year photos by month.
  const byMonth = new Map<number, PhotoRow[]>();
  for (const p of photos) {
    if (p.taken_at === null) continue;
    const d = new Date(p.taken_at);
    if (d.getFullYear() !== sourceYear) continue;
    const month = d.getMonth() + 1;
    const arr = byMonth.get(month) ?? [];
    arr.push(p);
    byMonth.set(month, arr);
  }

  function scoreOf(p: PhotoRow): number {
    return aggregateScore({
      cv: cvById.get(p.id),
      facesForPhoto: facesByPhoto.get(p.id) ?? [],
      pinnedClusterIds,
      tagsForPhoto: tags.get(p.id) ?? [],
      isDuplicateNonRep: isNonRep(p.id),
    });
  }

  function monthName(m: number): string {
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1];
  }

  const selectionId = await startSelection(projectId, 'calendar');

  for (let month = 1; month <= 12; month++) {
    let monthPhotos = byMonth.get(month) ?? [];
    let fallbackNote: string | null = null;

    // Adjacent-month fallback: if empty, try M-1, then M+1.
    if (monthPhotos.length === 0 && CALENDAR_DEFAULTS.empty_month_fallback === 'adjacent') {
      const tryOrder = [month - 1, month + 1].filter((m) => m >= 1 && m <= 12);
      for (const m of tryOrder) {
        const candidate = byMonth.get(m) ?? [];
        if (candidate.length > 0) {
          monthPhotos = candidate;
          fallbackNote = `Fallback from ${monthName(m)} ${sourceYear}`;
          break;
        }
      }
    }

    const scored = monthPhotos.map((p) => ({ photo: p, score: scoreOf(p) }));
    scored.sort((a, b) => b.score - a.score || a.photo.id - b.photo.id);
    const bucketKey = `${targetYear}-${month.toString().padStart(2, '0')}`;
    const take = Math.min(CALENDAR_DEFAULTS.photos_per_month, scored.length);
    for (let i = 0; i < take; i++) {
      await insertSelectedPhoto({
        selection_id: selectionId,
        photo_id: scored[i].photo.id,
        bucket_key: bucketKey,
        rank: i,
        score: scored[i].score,
        notes: fallbackNote,
      });
    }
  }

  return selectionId;
}

async function loadAllTagsCalendar(projectId: number): Promise<Map<number, PhotoTagRow[]>> {
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

async function loadDupRepsCalendar(projectId: number): Promise<Map<number, number>> {
  const d = await db();
  const rows = await d.select<{ id: number; representative_photo_id: number }[]>(
    'SELECT id, representative_photo_id FROM duplicate_group WHERE project_id = ?',
    [projectId]
  );
  return new Map(rows.map((r) => [r.id, r.representative_photo_id]));
}
