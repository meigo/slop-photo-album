export interface SlotTransform {
  /** Object-position X in percent (0..100). 50 = centered. */
  objectPositionX: number;
  /** Object-position Y in percent (0..100). */
  objectPositionY: number;
  /** Zoom factor. 1 = exactly object-fit: cover; >1 zooms in. */
  scale: number;
  /** CSS filter brightness. 1 = unchanged, 0 = black, 2 = double. */
  brightness: number;
  /** CSS filter contrast. 1 = unchanged. */
  contrast: number;
  /** CSS filter saturation. 1 = unchanged, 0 = grayscale, 2 = oversaturated. */
  saturation: number;
  /** Color temperature (-1..1). Positive = warmer (R+/B-), negative = cooler. */
  warmth: number;
  /** Green-magenta tint (-1..1). Positive = greener, negative = magenta. */
  tint: number;
}

export const IDENTITY_TRANSFORM: SlotTransform = {
  objectPositionX: 50,
  objectPositionY: 50,
  scale: 1,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  warmth: 0,
  tint: 0,
};

export function parseTransform(json: string | null): SlotTransform | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (
      !Number.isFinite(parsed.objectPositionX) ||
      !Number.isFinite(parsed.objectPositionY) ||
      !Number.isFinite(parsed.scale) ||
      parsed.scale <= 0 ||
      parsed.objectPositionX < 0 || parsed.objectPositionX > 100 ||
      parsed.objectPositionY < 0 || parsed.objectPositionY > 100
    ) {
      return null;
    }
    const clampFilter = (v: unknown, fallback: number): number => {
      if (!Number.isFinite(v as number)) return fallback;
      const n = v as number;
      if (n < 0 || n > 3) return fallback;
      return n;
    };
    const clampSigned = (v: unknown, fallback: number): number => {
      if (!Number.isFinite(v as number)) return fallback;
      const n = v as number;
      if (n < -1 || n > 1) return fallback;
      return n;
    };
    return {
      objectPositionX: parsed.objectPositionX,
      objectPositionY: parsed.objectPositionY,
      scale: parsed.scale,
      brightness: clampFilter(parsed.brightness, 1),
      contrast: clampFilter(parsed.contrast, 1),
      saturation: clampFilter(parsed.saturation, 1),
      warmth: clampSigned(parsed.warmth, 0),
      tint: clampSigned(parsed.tint, 0),
    };
  } catch {
    return null;
  }
}

export function serializeTransform(t: SlotTransform): string {
  return JSON.stringify({
    objectPositionX: t.objectPositionX,
    objectPositionY: t.objectPositionY,
    scale: t.scale,
    brightness: t.brightness,
    contrast: t.contrast,
    saturation: t.saturation,
    warmth: t.warmth,
    tint: t.tint,
  });
}

/** Returns the CSS the renderer needs. The `filter` field carries only
 *  the brightness/contrast/saturate functions; warmth + tint live in an
 *  SVG color matrix (see `svgColorMatrix`) referenced via `url(#id)`
 *  appended to the filter chain by the renderer when needed. */
export function cssForTransform(t: SlotTransform): {
  objectPosition: string;
  transform: string;
  transformOrigin: string;
  filter: string;
} {
  const px = t.objectPositionX.toFixed(2);
  const py = t.objectPositionY.toFixed(2);
  const s = t.scale.toFixed(4);
  const parts: string[] = [];
  if (t.brightness !== 1) parts.push(`brightness(${t.brightness.toFixed(3)})`);
  if (t.contrast !== 1) parts.push(`contrast(${t.contrast.toFixed(3)})`);
  if (t.saturation !== 1) parts.push(`saturate(${t.saturation.toFixed(3)})`);
  return {
    objectPosition: `${px}% ${py}%`,
    transform: `scale(${s})`,
    transformOrigin: `${px}% ${py}%`,
    filter: parts.join(' '),
  };
}

/** True if warmth or tint differs from neutral. */
export function hasColorShift(t: SlotTransform): boolean {
  return t.warmth !== 0 || t.tint !== 0;
}

/** Generate the 20-value feColorMatrix string for warmth + tint.
 *  Warmth shifts R↑ B↓ (or reverse); tint shifts G. Identity when both 0. */
export function svgColorMatrix(t: SlotTransform): string {
  const k = 0.25; // strength factor at slider extremes
  const r = (1 + t.warmth * k).toFixed(4);
  const g = (1 + t.tint * k).toFixed(4);
  const b = (1 - t.warmth * k).toFixed(4);
  return `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
}
