import { getProject, getCurrentSelection, listPagesForSelection, listSlotsForPages, db } from '$lib/db';
import { error } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

export async function load({ params }) {
  const id = Number(params.id);
  const project = await getProject(id);
  if (!project) throw error(404, 'Project not found');
  const selection = await getCurrentSelection(id, 'album');
  const pages = selection ? await listPagesForSelection(selection.id) : [];
  const slots = pages.length > 0 ? await listSlotsForPages(pages.map((p) => p.id)) : [];

  // Enrich slots with photo dimensions, faces, and top tag for auto-position.
  const photoIds = [...new Set(slots.map((s) => s.photo_id).filter((x): x is number => x !== null))];
  const photoMeta = new Map<number, { width: number | null; height: number | null }>();
  const facesByPhoto = new Map<number, Array<{ bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number }>>();
  const topTagByPhoto = new Map<number, string>();

  if (photoIds.length > 0) {
    const d = await db();
    const placeholders = photoIds.map(() => '?').join(',');
    const photoRows = await d.select<{ id: number; width: number | null; height: number | null }[]>(
      `SELECT id, width, height FROM photo WHERE id IN (${placeholders})`,
      photoIds
    );
    for (const p of photoRows) photoMeta.set(p.id, { width: p.width, height: p.height });

    const faceRows = await d.select<{ photo_id: number; bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number }[]>(
      `SELECT photo_id, bbox_x, bbox_y, bbox_w, bbox_h FROM face WHERE photo_id IN (${placeholders})`,
      photoIds
    );
    for (const f of faceRows) {
      const arr = facesByPhoto.get(f.photo_id) ?? [];
      arr.push({ bbox_x: f.bbox_x, bbox_y: f.bbox_y, bbox_w: f.bbox_w, bbox_h: f.bbox_h });
      facesByPhoto.set(f.photo_id, arr);
    }

    const tagRows = await d.select<{ photo_id: number; tag: string }[]>(
      `SELECT pt.photo_id, pt.tag FROM photo_tag pt
       INNER JOIN (
         SELECT photo_id, MAX(score) as ms FROM photo_tag WHERE photo_id IN (${placeholders}) GROUP BY photo_id
       ) m ON m.photo_id = pt.photo_id AND m.ms = pt.score
       WHERE pt.photo_id IN (${placeholders})`,
      [...photoIds, ...photoIds]
    );
    for (const t of tagRows) topTagByPhoto.set(t.photo_id, t.tag);
  }

  const enriched = slots.map((s) => {
    const meta = s.photo_id !== null ? photoMeta.get(s.photo_id) : null;
    return {
      ...s,
      photo_width: meta?.width ?? null,
      photo_height: meta?.height ?? null,
      faces: s.photo_id !== null ? (facesByPhoto.get(s.photo_id) ?? []) : [],
      top_tag: s.photo_id !== null ? (topTagByPhoto.get(s.photo_id) ?? null) : null,
    };
  });

  const slotsByPage = new Map<number, typeof enriched>();
  for (const s of enriched) {
    const arr = slotsByPage.get(s.page_id) ?? [];
    arr.push(s);
    slotsByPage.set(s.page_id, arr);
  }
  return { project, selection, pages, slotsByPage };
}
