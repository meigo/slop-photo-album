/**
 * v1 selection weights + targets. Hardcoded for Phase 3a. Phase 3c (or
 * sooner if needed) can lift these into a TOML config or UI sliders.
 */

export const SCORE_WEIGHTS = {
  // Positive contributors
  sharpness: 1.0,        // blur (Laplacian variance) normalized to 0-1
  exposure: 0.5,         // exposure score 0-1
  faces_count: 0.3,      // diminishing — capped at 4 faces
  faces_quality: 1.5,    // mean per-face quality
  // Negative contributors (subtracted)
  duplicate_member: 1.5, // non-representative member of a duplicate group
};

export const ALBUM_DEFAULTS = {
  // Per-day cap: at most this many photos per day taken.
  per_day_cap: 3,
  // After per-day capping, if a month still has more than this many
  // photos, drop the lowest-scoring entries until at or below the cap.
  // Prevents one vacation month from dominating the album.
  per_month_cap: 12,
  // Default target page count for the auto-assembler. Used when a project
  // hasn't overridden album_max_pages. Drives slot density via
  // total_photos / default_max_pages and the rotation bracket in picker.ts.
  default_max_pages: 24,
};

export const CALENDAR_DEFAULTS = {
  photos_per_month: 1,
  mode: 'seasonal-memory' as const,
  // When source-year has no photos for a month, try adjacent months
  // (M-1 then M+1, same year) before leaving the slot empty.
  empty_month_fallback: 'adjacent' as const,  // 'adjacent' | 'none'
};

/**
 * Sharpness normalization: raw Laplacian variance on a typical phone
 * photo lands in the 50-3000 range. We clamp to [0, 1] using a soft
 * saturation around the "definitely sharp" cutoff so the additive score
 * isn't dominated by an extreme outlier.
 */
export function normalizedSharpness(blur: number | null): number {
  if (blur === null || blur <= 0) return 0;
  // 100 = passable, 500 = sharp, 1500+ = very sharp (saturates).
  return Math.min(1.0, blur / 500);
}
