export interface SlotTransform {
  /** Horizontal offset, fraction of the slot width. 0 = centered.
   *  Positive moves the photo right (revealing more of the left side
   *  of the photo to the right of slot center). */
  offsetX: number;
  /** Vertical offset, fraction of the slot height. 0 = centered. */
  offsetY: number;
  /** Scale relative to the smallest fit (cover). 1 = `object-fit: cover`
   *  default. >1 zooms in. <1 isn't meaningful (would show empty area). */
  scale: number;
}

export const IDENTITY_TRANSFORM: SlotTransform = { offsetX: 0, offsetY: 0, scale: 1 };

export function parseTransform(json: string | null): SlotTransform | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (
      !Number.isFinite(parsed.offsetX) ||
      !Number.isFinite(parsed.offsetY) ||
      !Number.isFinite(parsed.scale) ||
      parsed.scale <= 0
    ) {
      return null;
    }
    return { offsetX: parsed.offsetX, offsetY: parsed.offsetY, scale: parsed.scale };
  } catch {
    return null;
  }
}

export function serializeTransform(t: SlotTransform): string {
  return JSON.stringify({ offsetX: t.offsetX, offsetY: t.offsetY, scale: t.scale });
}

/** Returns the CSS object-position string + transform string for an
 *  <img> rendered inside its slot. Slot is `object-fit: cover` so the
 *  image fills the slot area; we then translate/scale to apply the
 *  user's adjustment. */
export function cssForTransform(t: SlotTransform): { transform: string; transformOrigin: string } {
  const dx = (t.offsetX * 100).toFixed(2);
  const dy = (t.offsetY * 100).toFixed(2);
  const s = t.scale.toFixed(4);
  return {
    transform: `translate(${dx}%, ${dy}%) scale(${s})`,
    transformOrigin: 'center center',
  };
}
