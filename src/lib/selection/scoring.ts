import type { CvScoreRow, FaceRow } from '$lib/db/types';
import { SCORE_WEIGHTS, normalizedSharpness } from './constants';

/**
 * Aggregate per-photo score. Inputs:
 *  - cv: cv_score row (blur, exposure, faces_count, faces_json — phash unused here)
 *  - facesForPhoto: face rows for this photo (gives face.quality)
 *  - isDuplicateNonRep: true if this photo is in a duplicate_group AND is NOT the representative
 *
 * Returns a real number. Higher = better.
 *
 * Bias: the formula is additive + bounded per component, which makes
 * tuning straightforward but can produce ties. Selection algorithms
 * tiebreak by photo.id ascending to stay deterministic.
 */
export function aggregateScore(args: {
  cv: CvScoreRow | undefined;
  facesForPhoto: FaceRow[];
  isDuplicateNonRep: boolean;
}): number {
  let s = 0;

  // ---- Positive contributors ----
  if (args.cv) {
    s += SCORE_WEIGHTS.sharpness * normalizedSharpness(args.cv.blur);
    s += SCORE_WEIGHTS.exposure * (args.cv.exposure ?? 0.5);
    s += SCORE_WEIGHTS.faces_count * Math.min(4, args.cv.faces_count ?? 0);
  }

  // Face quality: mean over faces in this photo. Skip if none.
  if (args.facesForPhoto.length > 0) {
    let q = 0;
    for (const f of args.facesForPhoto) q += f.quality ?? 0;
    s += SCORE_WEIGHTS.faces_quality * (q / args.facesForPhoto.length);
  }

  // ---- Penalties ----
  if (args.isDuplicateNonRep) {
    s -= SCORE_WEIGHTS.duplicate_member;
  }

  return s;
}
