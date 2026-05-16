import type { SlotLayout } from './templates';
import { IDENTITY_TRANSFORM, type SlotTransform } from './transform';

const HORIZON_TAGS = new Set(['landscape', 'beach', 'forest', 'snow', 'city', 'outdoor']);

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, v));
}

/**
 * Compute a default object-position for a photo placed in a slot, using
 * face-bbox data + scene tags. Output values are percentages (0..100)
 * suitable for CSS `object-position`.
 *
 * Rules:
 *   1. If faces exist: place the union-face center at the slot's center.
 *      Pixel coordinates from the `face` table are converted to [0..1]
 *      photo-relative, then to a 0..100 percent that maps photo-coord
 *      to slot-center.
 *   2. Else if topTag is a horizon-biased scene: place photo-y = 0.5
 *      (assumed horizon line) at slot-y = 1/3.
 *   3. Else: identity (50%, 50%, scale 1).
 *
 * Scale is always 1 — auto-position never zooms; that's manual-only.
 */
export function autoPositionTransform(args: {
  photoWidth: number;
  photoHeight: number;
  faces: Array<{ bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number }>;
  topTag: string | null;
  slot: SlotLayout;
}): SlotTransform {
  const { photoWidth, photoHeight, faces, topTag, slot } = args;

  if (photoWidth <= 0 || photoHeight <= 0 || slot.w <= 0 || slot.h <= 0) {
    return { ...IDENTITY_TRANSFORM };
  }

  const slotAspect = slot.w / slot.h;
  const photoAspect = photoWidth / photoHeight;

  let vfX: number;
  let vfY: number;
  if (photoAspect > slotAspect) {
    vfY = 1;
    vfX = slotAspect / photoAspect;
  } else {
    vfX = 1;
    vfY = photoAspect / slotAspect;
  }

  // Pass 1: faces — center the union bbox at slot center.
  if (faces.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of faces) {
      minX = Math.min(minX, f.bbox_x);
      minY = Math.min(minY, f.bbox_y);
      maxX = Math.max(maxX, f.bbox_x + f.bbox_w);
      maxY = Math.max(maxY, f.bbox_y + f.bbox_h);
    }
    const cx = ((minX + maxX) / 2) / photoWidth;
    const cy = ((minY + maxY) / 2) / photoHeight;

    const px = vfX < 1 ? clampPct((cx - vfX / 2) / (1 - vfX) * 100) : 50;
    const py = vfY < 1 ? clampPct((cy - vfY / 2) / (1 - vfY) * 100) : 50;
    return { ...IDENTITY_TRANSFORM, objectPositionX: px, objectPositionY: py };
  }

  // Pass 2: horizon-biased — put photo-y = 0.5 at slot-y = 1/3.
  // Window center: (1-vf)*P/100 + vf/2 = target.
  // Solving for the slot-y position of photo-y=0.5: we want the slot's
  // upper-third to see photo-y=0.5, i.e. window position such that
  // photo-y=0.5 maps to slot-y=1/3.
  // window covers photo-y from (1-vf)*P/100 to (1-vf)*P/100 + vf.
  // photo-y=0.5 sits at slot-y = (0.5 - (1-vf)*P/100) / vf = 1/3
  // → (1-vf)*P/100 = 0.5 - vf/3 → P = (0.5 - vf/3) / (1 - vf) * 100.
  if (topTag && HORIZON_TAGS.has(topTag)) {
    const py = vfY < 1 ? clampPct((0.5 - vfY / 3) / (1 - vfY) * 100) : 50;
    return { ...IDENTITY_TRANSFORM, objectPositionY: py };
  }

  // Pass 3: identity.
  return { ...IDENTITY_TRANSFORM };
}
