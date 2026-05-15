# Family Album & Calendar Builder — Phase 3a (Selection) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given a fully-indexed project (Phases 1–2b produced photo rows + thumbs + EXIF dates + CV scores + face clusters + scene tags + duplicate groups), produce two **ordered selection lists**: a chronological album selection (one bucket per day) and a seasonal-memory calendar selection (one bucket per calendar month, sourced from the prior year's same-month photos). Each photo in a selection carries an aggregate score that drove its inclusion, plus a `user_state` field for manual override later. The dashboard gets two new buttons — **Generate Album** and **Generate Calendar** — that materialize selections, and a new page that shows the ordered selection bucket-by-bucket for review.

Phase 3a is the **selection step only**. Page composition (which template, which photos per page) and the page-review swap/pin/reject UI ship in Phase 3b. This split keeps the algorithm work separable from the layout work.

**Architecture:** New schema (migration 004) adds `selection` + `selected_photo` tables. A pure TS aggregate-scoring function consumes the per-photo signals already in the DB (`cv_score`, `face` + `person_cluster.is_pinned`, `photo_tag`, `duplicate_group_member`). Two selection algorithms — album (day-bucketed chronological) and calendar (seasonal-memory) — turn those scores plus constraint defaults into `selected_photo` rows. A new `/projects/[id]/selection/[kind]` route renders the resulting ordered list bucket-by-bucket. v1 hardcodes the constraint defaults in code; v2/Phase 3b can lift them into TOML/UI.

**Tech Stack additions:** None. Pure TS work over the existing SQLite/Tauri/Svelte stack.

**Spec reference:** `slop-ideas/docs/superpowers/specs/2026-05-14-family-album-builder-design.md` (sections on Selection + Constraint Layer).

**Working directory:** All tasks run from `/Users/meigo/Projects/slop/slop-family-album/`.

**Phase 3a NOT in scope** (deferred to Phase 3b or later):
- Page composition (template picker, page_slot assignment, page review UI) — **Phase 3b**
- TOML constraint config + UI for tuning weights — **Phase 3c if user demand**
- Manual cluster merge/split — **Phase 2c**
- PDF export — **Phase 4**
- LLM captions / titles — **Phase 4**
- Constraint solver beyond greedy (Z3/OR-tools) — only if greedy is empirically insufficient
- Cross-year selection ("show me last December too") — out of v1

---

## File Structure (Phase 3a additions)

```
slop-family-album/
  src-tauri/migrations/
    004_selection.sql                              # NEW
  src/lib/
    db/
      index.ts                                     # add selection helpers
      types.ts                                     # add SelectionRow, SelectedPhotoRow types
    selection/
      scoring.ts                                   # NEW — aggregate score per photo
      album.ts                                     # NEW — chronological selection algorithm
      calendar.ts                                  # NEW — seasonal-memory selection algorithm
      constants.ts                                 # NEW — hardcoded weights + targets for v1
  src/routes/projects/[id]/
    +page.svelte                                   # MODIFIED — add Generate Album / Generate Calendar buttons
    selection/
      [kind]/                                      # 'album' or 'calendar'
        +page.ts                                   # NEW — load current selection
        +page.svelte                               # NEW — render ordered list per bucket
```

---

## Phase 3A.1 — Schema

### Task 1: Migration 004_selection.sql

- [ ] **Step 1: Create `src-tauri/migrations/004_selection.sql`**

```sql
-- One row per generated selection (album or calendar). Re-generating
-- creates a NEW selection row; old ones stay in the DB so the user can
-- compare versions. The most recent generation per (project, kind) is
-- the "current" one; older ones have is_current = 0.
CREATE TABLE selection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                  -- 'album' or 'calendar'
  generated_at INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_selection_project_kind_current ON selection (project_id, kind, is_current);

-- Ordered selection of photos within a selection. `bucket_key` is:
--   album:    ISO date 'YYYY-MM-DD' (the day the photo was taken)
--   calendar: 'YYYY-MM' (calendar month the photo will appear on)
-- `rank` is the order within the bucket (0 = best). `score` is the
-- aggregate score that put the photo here (kept for debugging / future
-- "show me alternatives" UX). `user_state` is for Phase 3b manual edits.
CREATE TABLE selected_photo (
  selection_id INTEGER NOT NULL REFERENCES selection(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  bucket_key TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score REAL,
  user_state TEXT NOT NULL DEFAULT 'auto',   -- 'auto' | 'pinned' | 'rejected'
  PRIMARY KEY (selection_id, photo_id)
);

CREATE INDEX idx_selected_photo_bucket ON selected_photo (selection_id, bucket_key, rank);
```

- [ ] **Step 2: Register migration 004 in `src-tauri/src/lib.rs`**

Append to the existing `migrations()` vec:

```rust
tauri_plugin_sql::Migration {
  version: 4,
  description: "selection_album_calendar",
  sql: include_str!("../migrations/004_selection.sql"),
  kind: tauri_plugin_sql::MigrationKind::Up,
},
```

- [ ] **Step 3: Verify build**

```bash
cd src-tauri && cargo check && cd ..
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Migration 004: selection + selected_photo tables"
```

### Task 2: DB helpers for selection

- [ ] **Step 1: Extend `src/lib/db/types.ts`**

Append:

```ts
export interface SelectionRow {
  id: number;
  project_id: number;
  kind: string;          // 'album' | 'calendar' but typed loosely so the DB-row type matches sqlite columns
  generated_at: number;
  is_current: number;
}

export interface SelectedPhotoRow {
  selection_id: number;
  photo_id: number;
  bucket_key: string;
  rank: number;
  score: number | null;
  user_state: string;    // 'auto' | 'pinned' | 'rejected'
}

export interface SelectedPhotoInsert {
  selection_id: number;
  photo_id: number;
  bucket_key: string;
  rank: number;
  score: number | null;
  user_state?: string;   // defaults to 'auto' in SQL
}
```

- [ ] **Step 2: Extend `src/lib/db/index.ts`**

Add imports for the new types, then append:

```ts
// Mark all existing selections for this (project, kind) as no-longer-current,
// then insert a new one. Returns the new selection_id.
export async function startSelection(projectId: number, kind: 'album' | 'calendar'): Promise<number> {
  const d = await db();
  await d.execute(
    'UPDATE selection SET is_current = 0 WHERE project_id = ? AND kind = ?',
    [projectId, kind]
  );
  const result = await d.execute(
    'INSERT INTO selection (project_id, kind, generated_at, is_current) VALUES (?, ?, ?, 1)',
    [projectId, kind, Date.now()]
  );
  return result.lastInsertId as number;
}

export async function insertSelectedPhoto(args: SelectedPhotoInsert): Promise<void> {
  const d = await db();
  await d.execute(
    `INSERT INTO selected_photo (selection_id, photo_id, bucket_key, rank, score, user_state)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      args.selection_id, args.photo_id, args.bucket_key, args.rank,
      args.score, args.user_state ?? 'auto',
    ]
  );
}

export async function getCurrentSelection(projectId: number, kind: 'album' | 'calendar'): Promise<SelectionRow | null> {
  const d = await db();
  const rows = await d.select<SelectionRow[]>(
    'SELECT * FROM selection WHERE project_id = ? AND kind = ? AND is_current = 1 LIMIT 1',
    [projectId, kind]
  );
  return rows[0] ?? null;
}

// Returns selected photos for a selection, ordered by bucket_key (chronological
// for album, calendar) then rank within bucket.
export async function listSelectedPhotos(selectionId: number): Promise<Array<SelectedPhotoRow & { path: string; thumb_path: string | null; taken_at: number | null }>> {
  const d = await db();
  return d.select<Array<SelectedPhotoRow & { path: string; thumb_path: string | null; taken_at: number | null }>>(
    `SELECT sp.*, p.path, p.thumb_path, p.taken_at
     FROM selected_photo sp
     INNER JOIN photo p ON p.id = sp.photo_id
     WHERE sp.selection_id = ?
     ORDER BY sp.bucket_key ASC, sp.rank ASC`,
    [selectionId]
  );
}
```

Update the existing top `import type` line to include `SelectionRow`, `SelectedPhotoInsert`. (`SelectedPhotoRow` is re-exported via types.ts and not used directly here.)

- [ ] **Step 3: Verify build**

```bash
npm run build && npm run check
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "DB module: selection + selected_photo helpers"
```

---

## Phase 3A.2 — Scoring + Selection Algorithms

### Task 3: Constants module

- [ ] **Step 1: Create `src/lib/selection/constants.ts`**

```ts
/**
 * v1 selection weights + targets. Hardcoded for Phase 3a. Phase 3c (or
 * sooner if needed) can lift these into a TOML config or UI sliders.
 *
 * Rationale per weight is in the scoring module; the choices below are
 * informed by the design spec's "scoring formula" section.
 */

export const SCORE_WEIGHTS = {
  // Positive contributors
  sharpness: 1.0,        // blur (Laplacian variance) normalized to 0-1
  exposure: 0.5,         // exposure score 0-1
  faces_count: 0.3,      // diminishing — capped at 4 faces
  faces_quality: 1.5,    // mean per-face quality
  pinned_person: 1.0,    // bonus per pinned person present in this photo
  // Negative contributors (subtracted)
  duplicate_member: 1.5,    // non-representative member of a duplicate group
  screenshot: 5.0,          // hard penalty if scene-tag 'screenshot' > 0.5
  document: 5.0,            // hard penalty if scene-tag 'document' > 0.5
};

export const ALBUM_DEFAULTS = {
  // Per-day cap: at most this many photos per day taken (a day-bucket).
  // Soft — over-budget days drop lowest-scoring beyond this cap.
  per_day_cap: 3,
};

export const CALENDAR_DEFAULTS = {
  // How many photos to put in each calendar month.
  photos_per_month: 1,
  // 'seasonal-memory' is the only mode in 3a. 'best-of' is deferred.
  mode: 'seasonal-memory' as const,
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Selection: constants module (weights + targets)"
```

### Task 4: Aggregate scoring function

- [ ] **Step 1: Create `src/lib/selection/scoring.ts`**

```ts
import type { CvScoreRow, FaceRow, PersonClusterRow, PhotoTagRow } from '$lib/db/types';
import { SCORE_WEIGHTS, normalizedSharpness } from './constants';

/**
 * Aggregate per-photo score. Inputs:
 *  - cv: cv_score row (blur, exposure, faces_count, faces_json — phash unused here)
 *  - facesForPhoto: face rows for this photo (gives face.quality + cluster_id)
 *  - pinnedClusterIds: set of person_cluster.id with is_pinned = 1
 *  - tagsForPhoto: photo_tag rows for this photo
 *  - isDuplicateNonRep: true if this photo is in a duplicate_group AND is NOT the representative
 *
 * Returns a real number. Higher = better. Negative values are possible
 * (heavy penalties from screenshot/document tags).
 *
 * Bias: the formula is additive + bounded per component, which makes
 * tuning straightforward but can produce ties. Selection algorithms
 * tiebreak by photo.id ascending to stay deterministic.
 */
export function aggregateScore(args: {
  cv: CvScoreRow | undefined;
  facesForPhoto: FaceRow[];
  pinnedClusterIds: Set<number>;
  tagsForPhoto: PhotoTagRow[];
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

  // Pinned-person bonus: +weight per distinct pinned cluster present.
  const pinnedClustersPresent = new Set<number>();
  for (const f of args.facesForPhoto) {
    if (f.cluster_id !== null && args.pinnedClusterIds.has(f.cluster_id)) {
      pinnedClustersPresent.add(f.cluster_id);
    }
  }
  s += SCORE_WEIGHTS.pinned_person * pinnedClustersPresent.size;

  // ---- Penalties ----
  if (args.isDuplicateNonRep) {
    s -= SCORE_WEIGHTS.duplicate_member;
  }
  for (const t of args.tagsForPhoto) {
    if (t.tag === 'screenshot' && t.score > 0.5) s -= SCORE_WEIGHTS.screenshot;
    if (t.tag === 'document' && t.score > 0.5) s -= SCORE_WEIGHTS.document;
  }

  return s;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build && npm run check
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Selection: aggregate scoring function"
```

### Task 5: Album selection algorithm

- [ ] **Step 1: Create `src/lib/selection/album.ts`**

```ts
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
  const tags = await loadAllTags(projectId);  // helper below
  const dupGroupByPhoto = await listDuplicateMembersByPhoto(projectId);
  const dupReps = await loadDuplicateRepresentatives(projectId);  // helper below
  // For each dup-group member, decide if it's the representative.
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
  for (const [day, items] of byDay) {
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

async function loadAllTags(projectId: number): Promise<Map<number, PhotoTagRow[]>> {
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

async function loadDuplicateRepresentatives(projectId: number): Promise<Map<number, number>> {
  // group_id → representative_photo_id
  const d = await db();
  const rows = await d.select<{ id: number; representative_photo_id: number }[]>(
    'SELECT id, representative_photo_id FROM duplicate_group WHERE project_id = ?',
    [projectId]
  );
  return new Map(rows.map((r) => [r.id, r.representative_photo_id]));
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build && npm run check
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Selection: album algorithm (chronological day-bucketed)"
```

### Task 6: Calendar selection algorithm (seasonal-memory)

- [ ] **Step 1: Create `src/lib/selection/calendar.ts`**

```ts
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
 *   2. Score them via aggregateScore.
 *   3. Take top photos_per_month by score.
 *   4. Materialize as selected_photo rows with bucket_key = 'YYYY-MM'
 *      (the calendar year + month).
 *
 * If a month has no photos in the source year, its bucket is empty —
 * the UI will surface this so the user can react (broaden range, accept).
 *
 * Returns the new selection.id.
 */
export async function generateCalendarSelection(projectId: number): Promise<number> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);
  const sourceYear = project.calendar_year - 1;
  const targetYear = project.calendar_year;

  // Same context-loading as album.ts.
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

  // Bucket source-year photos by their month (1-12).
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

  const selectionId = await startSelection(projectId, 'calendar');

  for (let month = 1; month <= 12; month++) {
    const monthPhotos = byMonth.get(month) ?? [];
    const scored = monthPhotos.map((p) => ({
      photo: p,
      score: aggregateScore({
        cv: cvById.get(p.id),
        facesForPhoto: facesByPhoto.get(p.id) ?? [],
        pinnedClusterIds,
        tagsForPhoto: tags.get(p.id) ?? [],
        isDuplicateNonRep: isNonRep(p.id),
      }),
    }));
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build && npm run check
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Selection: calendar algorithm (seasonal-memory)"
```

---

## Phase 3A.3 — UI

### Task 7: Generate buttons on the dashboard

- [ ] **Step 1: Update `src/routes/projects/[id]/+page.svelte`**

Read the existing file. The button row currently has: Index now, Re-run CV, People, Open library. Add two more: Generate Album, Generate Calendar. They should be in a SECOND row (the first row is busy enough) and visually grouped.

Add at the top of the `<script>`:

```ts
  import { generateAlbumSelection } from '$lib/selection/album';
  import { generateCalendarSelection } from '$lib/selection/calendar';
  import { goto } from '$app/navigation';

  let generating = $state<null | 'album' | 'calendar'>(null);

  async function runGenerateAlbum() {
    generating = 'album';
    try {
      await generateAlbumSelection(data.project.id);
      await goto(`/projects/${data.project.id}/selection/album`);
    } finally {
      generating = null;
    }
  }

  async function runGenerateCalendar() {
    generating = 'calendar';
    try {
      await generateCalendarSelection(data.project.id);
      await goto(`/projects/${data.project.id}/selection/calendar`);
    } finally {
      generating = null;
    }
  }
```

After the existing button-row `<div>` (the one with Index now / Re-run CV / People / Open library), add a NEW row:

```svelte
    <div class="flex gap-2 mt-3">
      <button type="button" class="btn-primary" onclick={runGenerateAlbum} disabled={generating !== null}>
        {generating === 'album' ? 'Generating album…' : 'Generate album'}
      </button>
      <button type="button" class="btn-primary" onclick={runGenerateCalendar} disabled={generating !== null}>
        {generating === 'calendar' ? 'Generating calendar…' : 'Generate calendar'}
      </button>
    </div>
```

Don't change anything else on the dashboard.

- [ ] **Step 2: Build verification**

```bash
npm run build && npm run check
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Dashboard: Generate album + Generate calendar buttons"
```

### Task 8: Selection view route

- [ ] **Step 1: Create `src/routes/projects/[id]/selection/[kind]/+page.ts`**

```ts
import { getProject, getCurrentSelection, listSelectedPhotos } from '$lib/db';
import { error } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

export async function load({ params }) {
  const id = Number(params.id);
  const kind = params.kind;
  if (kind !== 'album' && kind !== 'calendar') {
    throw error(404, 'Unknown selection kind');
  }
  const project = await getProject(id);
  if (!project) throw error(404, 'Project not found');
  const selection = await getCurrentSelection(id, kind);
  if (!selection) {
    return { project, kind, selection: null, photosByBucket: new Map() };
  }
  const photos = await listSelectedPhotos(selection.id);
  // Group by bucket_key (already sorted ASC; rank ASC within).
  const photosByBucket = new Map<string, typeof photos>();
  for (const p of photos) {
    const arr = photosByBucket.get(p.bucket_key) ?? [];
    arr.push(p);
    photosByBucket.set(p.bucket_key, arr);
  }
  return { project, kind, selection, photosByBucket };
}
```

- [ ] **Step 2: Create `src/routes/projects/[id]/selection/[kind]/+page.svelte`**

```svelte
<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { convertFileSrc } from '@tauri-apps/api/core';

  let { data } = $props();

  function bucketLabel(key: string, kind: 'album' | 'calendar'): string {
    if (kind === 'album') {
      // 'YYYY-MM-DD' → 'Jul 15, 2025'
      if (key === 'no-date') return 'No date';
      const d = new Date(key + 'T12:00:00');
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    // calendar 'YYYY-MM' → 'January 2026'
    const d = new Date(key + '-15T12:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }

  let totalPhotos = $derived(
    [...data.photosByBucket.values()].reduce((a, b) => a + b.length, 0)
  );
</script>

<div class="container-page" style="max-width: 1000px;">
  <PageHeader backHref={`/projects/${data.project.id}`}>
    <h1 class="text-xl font-medium">
      {data.project.name} — {data.kind === 'album' ? 'album' : 'calendar'} selection
    </h1>
  </PageHeader>

  {#if !data.selection}
    <section class="surface-card mt-4">
      <p style="color: var(--color-muted)">
        No {data.kind} generated yet. Return to the dashboard and click
        "Generate {data.kind}".
      </p>
    </section>
  {:else}
    <p class="text-sm mt-2" style="color: var(--color-muted)">
      {totalPhotos} photos across {data.photosByBucket.size} bucket{data.photosByBucket.size === 1 ? '' : 's'}
      · generated {new Date(data.selection.generated_at).toLocaleString()}
    </p>

    <div class="flex flex-col gap-6 mt-4">
      {#each [...data.photosByBucket.entries()] as [bucket, photos]}
        <section>
          <h2 class="text-lg font-medium mb-2">{bucketLabel(bucket, data.kind)}</h2>
          <div class="grid grid-cols-4 gap-2">
            {#each photos as photo}
              <figure class="surface-card p-1">
                {#if photo.thumb_path}
                  <img src={convertFileSrc(photo.thumb_path)} alt="" class="w-full aspect-square object-cover rounded" />
                {:else}
                  <div class="w-full aspect-square" style="background: var(--color-line)"></div>
                {/if}
                <figcaption class="text-xs mt-1" style="color: var(--color-muted)">
                  rank {photo.rank} · score {photo.score?.toFixed(2) ?? '—'}
                </figcaption>
              </figure>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 3: Build verification**

```bash
npm run build && npm run check
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Selection view: ordered list by bucket with rank + score"
```

---

## Phase 3A.4 — Close-out

### Task 9: README + Phase 3a tag

- [ ] **Step 1: Update `README.md`**

Replace the Status section:

```markdown
## Status

**Phase 1 (Foundation) — complete.** App indexes a folder into SQLite with thumbnails + EXIF and shows the library as a grid.

**Phase 2a (CV pipeline) — complete.** Python sidecar runs blur + face detection + perceptual hash on every indexed photo. Duplicate groups are detected via pHash Hamming distance.

**Phase 2b (Semantic CV) — complete.** Image embeddings (OpenCLIP), zero-shot scene tags, SFace face embeddings, face clustering, exposure scoring. People page lets you name face clusters and pin "must-include" ones.

**Phase 3a (Selection) — complete.** Aggregate scoring + chronological album selection + seasonal-memory calendar selection. Dashboard has Generate buttons; selection view shows the ordered list bucket-by-bucket.

Phase 3b (page layout + review UI) and Phase 4 (PDF export + LLM captions) are planned but not yet implemented.

See `docs/superpowers/specs/2026-05-14-family-album-builder-design.md` for the design.
```

- [ ] **Step 2: Verify plan + spec are in `docs/superpowers/`**

Copy this plan from slop-ideas if not already present:

```bash
cp /Users/meigo/Projects/slop/slop-ideas/docs/superpowers/plans/2026-05-15-family-album-phase-3a-selection.md docs/superpowers/plans/ 2>/dev/null || true
ls docs/superpowers/plans/
```

- [ ] **Step 3: Final commit + tag + push**

```bash
git add README.md docs/superpowers/plans/
git commit -m "Phase 3a close-out: README, plan copy"
git tag phase-3a-selection
git push origin main
git push origin phase-3a-selection
```

---

## Phase 3a Definition of Done

- [ ] Migration 004 runs cleanly on existing Phase 2b databases.
- [ ] Generate Album button on the dashboard produces a new `selection` row (kind='album') and a tree of `selected_photo` rows bucketed by day.
- [ ] Generate Calendar button produces a `selection` row (kind='calendar') with bucket_key = 'YYYY-MM' for each calendar-year month that had source-year photos.
- [ ] Selection view at `/projects/[id]/selection/album` shows the chronological ordered list bucket-by-bucket with thumbnails + rank + score.
- [ ] Selection view at `/projects/[id]/selection/calendar` shows the 12 calendar months (empty buckets included for months that had no source-year photos).
- [ ] Re-generating overwrites the "current" selection (older selections become `is_current = 0` but stay in DB for now).
- [ ] Pinned person clusters get a score bonus and tend to appear in selections more often.
- [ ] Photos in duplicate groups (non-representative) get demoted.
- [ ] Photos with high-confidence 'screenshot' or 'document' tags get heavily penalized.
- [ ] All existing automated tests still pass.

---

## Out of Phase 3a (covered in 3b / later)

- Page composition: assigning selected photos to pages with templates (hero / pair / quad / etc.) — **Phase 3b**
- Page review UI: per-page swap / pin / reject — **Phase 3b**
- Template override per page — **Phase 3b**
- Constraint config in TOML or UI — **Phase 3c**
- People-balance constraint (avoid clustering a single person on consecutive pages) — **Phase 3b**
- Page-budget rebalancing (drop lowest-scoring to fit `target_pages`) — **Phase 3b**
- Manual cluster merge/split — **Phase 2c**
- PDF export — **Phase 4**
- LLM captions — **Phase 4**
