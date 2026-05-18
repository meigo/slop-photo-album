import { TEMPLATES, type Template, albumTemplates } from './templates';

/**
 * Hand-curated template rotations, each labeled with the avg slot count its
 * cycle produces. The assembler picks the first rotation whose `avg >= target`
 * — that ensures the chosen rotation always fits within `max_pages` (even if
 * with some slack), instead of undershooting and dropping the photo tail.
 *
 * Each rotation is ordered for visual rhythm: small/big alternation inside
 * the cycle keeps the eye moving across a printed spread.
 */
const ROTATIONS: ReadonlyArray<{ avg: number; ids: readonly string[] }> = [
  { avg: 1.0, ids: ['hero-1'] },
  { avg: 1.5, ids: ['hero-1', 'pair-h'] },
  { avg: 2.0, ids: ['hero-1', 'pair-h', 'pair-v', 'trio-asym'] },
  { avg: 2.5, ids: ['hero-1', 'pair-h', 'trio-asym', 'quad-grid'] },
  { avg: 2.6, ids: ['trio-asym', 'pair-h', 'quad-grid', 'pair-asym-h', 'pair-v'] },
  { avg: 3.8, ids: ['quad-grid', 'trio-asym', 'six-grid', 'pair-h', 'quad-asym'] },
  { avg: 5.0, ids: ['six-grid', 'quad-grid', 'six-grid', 'quad-asym'] },
];

export function pickRotation(targetSlotsPerPage: number): readonly string[] {
  const found = ROTATIONS.find((r) => r.avg >= targetSlotsPerPage);
  return (found ?? ROTATIONS[ROTATIONS.length - 1]).ids;
}

/**
 * Pick the largest album template whose `slot_count` fits within `available`
 * photos, biased away from `avoidTemplateId` to prevent two identical
 * consecutive pages. Used by the assembler when:
 *   - the rotation's next template doesn't fit the remaining photos, or
 *   - we're on the last page and want to soak up leftovers.
 */
export function pickFittingTemplate(available: number, avoidTemplateId: string | null): Template {
  const candidates = albumTemplates()
    .filter((t) => t.slot_count <= available)
    .sort((a, b) => b.slot_count - a.slot_count);
  if (candidates.length === 0) return TEMPLATES['hero-1'];
  const nonRepeat = candidates.find((t) => t.id !== avoidTemplateId);
  return nonRepeat ?? candidates[0];
}

/**
 * Resolve the next template for a page, honoring the rotation when possible
 * and falling back to `pickFittingTemplate` when the rotation's choice would
 * leave photos unused or can't be filled.
 */
export function pickNextAlbumTemplate(
  rotation: readonly string[],
  rotationIndex: number,
  availablePhotos: number,
  previousTemplateId: string | null,
): Template {
  const candidate = TEMPLATES[rotation[rotationIndex % rotation.length]];
  if (candidate.slot_count <= availablePhotos && candidate.id !== previousTemplateId) {
    return candidate;
  }
  return pickFittingTemplate(availablePhotos, previousTemplateId);
}

export function pickCalendarTemplate(): Template {
  return TEMPLATES['cal-month'];
}
