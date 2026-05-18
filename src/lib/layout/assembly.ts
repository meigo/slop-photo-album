import {
  listSelectedPhotos, getProject, getCurrentSelection,
  insertPage, insertPageSlot, clearPagesForSelection,
} from '$lib/db';
import { ALBUM_DEFAULTS } from '$lib/selection/constants';
import { pickRotation, pickNextAlbumTemplate, pickCalendarTemplate } from './picker';

/**
 * Build pages for the current album selection of a project. Replaces any
 * existing pages.
 *
 * Strategy: pack the chronologically-ordered selection into at most
 * `project.album_max_pages` pages (default 24) by cycling through a
 * template rotation whose average slot count matches `total_photos /
 * max_pages`. This produces varied layouts rather than one page per day
 * — without it, a year of mostly-1-photo days collapses to a long album
 * of identical hero-1 pages.
 */
export async function assembleAlbumPages(projectId: number): Promise<void> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);
  const selection = await getCurrentSelection(projectId, 'album');
  if (!selection) throw new Error(`No current album selection for project ${projectId}`);
  await clearPagesForSelection(selection.id);

  const sel = await listSelectedPhotos(selection.id);
  if (sel.length === 0) return;

  const maxPages = project.album_max_pages ?? ALBUM_DEFAULTS.default_max_pages;
  const targetPages = Math.min(maxPages, sel.length);
  const avgSlots = sel.length / targetPages;
  const rotation = pickRotation(avgSlots);

  // sel is already ordered by bucket_key ASC (chronological) from
  // listSelectedPhotos; we don't re-sort here so the page order tracks time.
  let queue = [...sel];
  let pageIndex = 0;
  let rotationIndex = 0;
  let previousTemplateId: string | null = null;

  while (queue.length > 0 && pageIndex < maxPages) {
    const template = pickNextAlbumTemplate(rotation, rotationIndex, queue.length, previousTemplateId);
    const chunk = queue.slice(0, template.slot_count);
    queue = queue.slice(template.slot_count);

    const pageId = await insertPage({
      selection_id: selection.id,
      index_in_book: pageIndex,
      template_id: template.id,
      title: chunk[0].bucket_key,
    });
    for (let s = 0; s < chunk.length; s++) {
      await insertPageSlot({
        page_id: pageId,
        slot_index: s,
        photo_id: chunk[s].photo_id,
      });
    }
    previousTemplateId = template.id;
    pageIndex++;
    rotationIndex++;
  }
}

/**
 * Build calendar pages — always 12, one per month. Each page uses the
 * 'cal-month' template (single full-bleed photo slot). If a month has
 * no selected photo, the slot is created with photo_id = null and the
 * user can fill it via the picker.
 */
export async function assembleCalendarPages(projectId: number): Promise<void> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);
  const selection = await getCurrentSelection(projectId, 'calendar');
  if (!selection) throw new Error(`No current calendar selection for project ${projectId}`);
  await clearPagesForSelection(selection.id);

  const sel = await listSelectedPhotos(selection.id);
  const byMonth = new Map<string, typeof sel>();
  for (const s of sel) {
    const arr = byMonth.get(s.bucket_key) ?? [];
    arr.push(s);
    byMonth.set(s.bucket_key, arr);
  }

  const template = pickCalendarTemplate();
  for (let month = 1; month <= 12; month++) {
    const bucketKey = `${project.calendar_year}-${month.toString().padStart(2, '0')}`;
    const monthPhotos = byMonth.get(bucketKey) ?? [];
    const pageId = await insertPage({
      selection_id: selection.id,
      index_in_book: month - 1,
      template_id: template.id,
      title: bucketKey,
    });
    await insertPageSlot({
      page_id: pageId,
      slot_index: 0,
      photo_id: monthPhotos[0]?.photo_id ?? null,
    });
  }
}
