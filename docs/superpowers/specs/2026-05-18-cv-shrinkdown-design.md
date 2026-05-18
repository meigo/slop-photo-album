# CV Shrinkdown — Design

**Date:** 2026-05-18
**Status:** Approved (this brainstorm)

## Summary

Strip OpenCLIP image embeddings, OpenCLIP scene tagging, and SFace face
clustering out of the photo album's CV pipeline. Keep blur detection, YuNet
face count + bboxes + bbox-derived quality, exposure scoring, pHash duplicate
detection, and EXIF date sorting — the signals that actually drive
auto-selection quality. Net result: Windows installer drops from ~1.6 GB to
~860 MB (saving ~740 MB by removing PyTorch + open-clip-torch + the SFace
model), the Python sidecar gets significantly simpler, and the selection
scoring formula sheds three branches it never meaningfully exercised in v1.

## Motivation

The v1 CV pipeline ships seven signals. Three of them earn their cost; four
are either mothballed or low-marginal-value:

- **High-value, cheap signals (keep):** Laplacian blur, YuNet face count,
  OpenCV exposure, imagehash pHash.
- **Mothballed (remove):** SFace face embeddings + clustering. The README
  explicitly says *"Face clustering retained in code but de-emphasized in v1
  UX (People page not surfaced in nav)"* — cluster naming/pinning never
  happens, and the `pinned_person` scoring branch never fires in practice.
- **Low marginal value (remove):** OpenCLIP image embeddings + scene tagging.
  Scene tags affect selection only through screenshot/document penalties on a
  friends-and-family library where screenshots are <1% of photos. The 512-dim
  image embeddings are stored but never consumed downstream — no similarity
  search, no "more like this", no semantic features are planned.

PyTorch + open-clip-torch account for ~650 MB of the eventual installer
footprint. The SFace ONNX model adds another 37 MB for a feature whose UX is
hidden. Removing these unblocks a release pipeline that's currently
impractical due to install size and simplifies the selection scoring code to
match its actual signals.

Closing the door on semantic-search-style features is an explicit decision
made during the brainstorm: such features aren't on the roadmap for the
friends-and-family product, and re-introducing CLIP later if priorities shift
is well-trodden ground (1–2 weeks of focused work).

## Scope

**In scope:**

- Delete OpenCLIP-related Python sidecar modules, deps, routes, tests.
- Delete SFace face-embedding module, model file, related tests.
- Update the renderer's DB layer, selection scoring, indexer, and UI
  components to drop embedding/tag/cluster references.
- Schema migrations to drop dead tables and columns.
- README updates to remove OpenCLIP / face-clustering mentions.

**Out of scope:**

- The release pipeline (resumes after this lands; locked-in decisions are
  preserved in memory).
- LLM captions (already retired — see prior decision; text overlays cover
  the use case).
- Building out face clustering as a real feature (re-add cleanly later if
  priorities change).
- Adding semantic search / similarity features.
- Replacing screenshot rejection with a heuristic or dedicated classifier —
  user manually deselects the few that slip through.

## What stays unchanged

These CV signals continue to drive auto-selection:

| Signal | Source | Contribution |
|---|---|---|
| EXIF date | Node sidecar via exiftool-vendored | Album chronological sort, calendar seasonal-memory mapping |
| Laplacian blur | `py-sidecar/src/server/blur.py` (OpenCV) | `cv_score.blur` → `aggregateScore` sharpness component |
| Face count | `py-sidecar/src/server/faces.py` (YuNet ONNX) | `cv_score.faces_count` → `aggregateScore` faces_count component |
| Face quality | YuNet `confidence × normalized_size` | `face.quality` → `aggregateScore` faces_quality component |
| Face bboxes | YuNet | Stored on `face` table; used for face-aware blur scoring and face-aware default crop |
| Exposure | `py-sidecar/src/server/exposure.py` | `cv_score.exposure` → `aggregateScore` exposure component |
| pHash | `py-sidecar/src/server/phash.py` (imagehash) | `cv_score.phash` → `duplicate_group` membership |

## What gets removed

### 1. OpenCLIP

**Python sidecar:**

- Delete `py-sidecar/src/server/embed.py`.
- Delete `py-sidecar/src/server/tags.py`.
- Delete `py-sidecar/tests/test_embed.py`.
- Delete `py-sidecar/tests/test_tags.py`.
- Update `py-sidecar/src/server/app.py`:
  - Remove `from server.embed import embed_image, model_key`.
  - Remove `from server.tags import score_tags`.
  - Remove `class EmbedRequest`, `class TagsRequest`.
  - Remove `/embed` and `/tags` routes.
- Update `py-sidecar/pyproject.toml`: remove `torch>=2.0` and
  `open-clip-torch>=2.24`.

**Renderer:**

- Update `src/lib/sidecar/py-client.ts`: delete `embedImage()` and
  `scoreTags()` (around lines 59 and 64).
- Update `src/lib/db/index.ts`:
  - Remove `INSERT INTO image_embedding` and the `upsertImageEmbedding`
    helper (around line 369).
  - Remove the SELECT helper that joins `image_embedding` for
    cache-invalidation checks (around lines 382–390).
  - Remove the `LEFT JOIN image_embedding` in `listSlotsForPages` (around
    line 659); drop `embedding` from the return type.
  - Remove the `(SELECT ie.vector …) as embedding` correlated subqueries in
    the photo-listing functions (around lines 784, 794).
  - Remove `replacePhotoTags` and the `photo_tag`-related queries (around
    lines 393–410, 717, 966).
  - Remove `top_tag` from `SlotLayoutContext` (around line 678) and any
    consumers.
- Update `src/lib/db/types.ts`: remove the `embedding` field from row types
  (around lines 127, 139); remove `PhotoTagRow`.
- Update `src/lib/selection/scoring.ts`:
  - Drop the `tagsForPhoto: PhotoTagRow[]` parameter.
  - Remove the screenshot/document penalty branches (around lines 55–58).
- Update `src/lib/selection/constants.ts`: remove `screenshot` and
  `document` keys from `SCORE_WEIGHTS`.
- Update `src/lib/selection/album.ts` and `src/lib/selection/calendar.ts`:
  - Drop the `photo_tag` SELECT queries (e.g. `calendar.ts` around line
    147).
  - Drop the `tagsForPhoto` argument at `aggregateScore` call sites.
- Update `src/lib/indexing/scanner.ts`: remove the Phase 2b block (around
  lines 138–144) that calls `embedViaPy` and `tagsViaPy`.
- Update `src/lib/components/PageView.svelte`: remove `top_tag` from the
  slot interface (around line 21) and its rendering (around line 94).

### 2. Face clustering

**Python sidecar:**

- Delete `py-sidecar/src/server/face_embed.py`.
- Delete `py-sidecar/tests/test_face_embed.py` (if present).
- Delete `py-sidecar/models/face_recognition_sface_2021dec.onnx`.
- Remove the SFace section from `py-sidecar/models/MODEL_SOURCE.md`.
- Update `py-sidecar/src/server/faces.py`:
  - Remove `from server.face_embed import embed_face_aligned`.
  - Remove the `with_embeddings` parameter from `detect_faces`.
  - Move the `quality` calculation **out** of the `if with_embeddings:`
    block so face quality is always computed (it's bbox-only — doesn't need
    SFace).
  - Remove the `embedding_b64` field from the returned face dicts.
- Update `py-sidecar/src/server/app.py`:
  - Remove `with_embeddings: bool = False` from `FacesRequest`.

**Renderer:**

- Delete `src/lib/indexing/face-clustering.ts`.
- Delete the People page route directory (`src/routes/projects/[id]/people/`,
  currently not surfaced in nav). Verify the path during implementation.
- Update `src/lib/sidecar/py-client.ts`: remove `withEmbeddings` from
  `facesViaPy`.
- Update `src/lib/db/index.ts`:
  - Remove `embedding` and `cluster_id` from `INSERT INTO face` (around line
    425) — the INSERT becomes 7 columns instead of 9.
  - Remove any `person_cluster` queries.
  - Remove any `cluster_id` UPDATE paths.
- Update `src/lib/db/types.ts`: remove `embedding` and `cluster_id` from
  `FaceRow`.
- Update `src/lib/selection/scoring.ts`:
  - Drop the `pinnedClusterIds: Set<number>` parameter.
  - Remove the pinned-person branch (around lines 42–49).
- Update `src/lib/selection/constants.ts`: remove `pinned_person` from
  `SCORE_WEIGHTS`.
- Update `src/lib/selection/album.ts` and `src/lib/selection/calendar.ts`:
  - Drop `person_cluster` SELECT queries that compute the pinned-cluster
    set.
  - Drop the `pinnedClusterIds` argument at `aggregateScore` call sites.
- Update `src/lib/indexing/scanner.ts`: remove the face-clustering call
  after the CV pass.

## Schema migrations

Add two new migrations to `src-tauri/migrations/` and register them in
`src-tauri/src/lib.rs`.

**`024_drop_clip.sql`** — drops dead tables from the OpenCLIP era:

```sql
DROP TABLE IF EXISTS image_embedding;
DROP TABLE IF EXISTS photo_tag;
```

**`025_drop_face_clustering.sql`** — drops the clustering tables and per-face
columns:

```sql
DROP TABLE IF EXISTS person_cluster;
ALTER TABLE face DROP COLUMN cluster_id;
ALTER TABLE face DROP COLUMN embedding;
```

`ALTER TABLE … DROP COLUMN` requires SQLite ≥ 3.35 (March 2021).
`tauri-plugin-sql` bundles `sqlx-sqlite` with a modern SQLite — this should
work. **Verification step during implementation:** run the migration on a
development database first. If `DROP COLUMN` fails for any reason, fall back
to the standard "rename old → create new → `INSERT SELECT` → drop old →
rename new" pattern.

Register both migrations in `src-tauri/src/lib.rs::migrations()`:

```rust
tauri_plugin_sql::Migration {
  version: 24,
  description: "drop_clip_tables",
  sql: include_str!("../migrations/024_drop_clip.sql"),
  kind: tauri_plugin_sql::MigrationKind::Up,
},
tauri_plugin_sql::Migration {
  version: 25,
  description: "drop_face_clustering",
  sql: include_str!("../migrations/025_drop_face_clustering.sql"),
  kind: tauri_plugin_sql::MigrationKind::Up,
},
```

## README updates

- **Features → Library** bullet list: remove "OpenCLIP scene tagging" and
  "SFace identity embeddings".
- **Tech stack** paragraph: remove OpenCLIP and torch mentions; simplify
  "Python sidecar (FastAPI + OpenCV + OpenCLIP + imagehash)" to "Python
  sidecar (FastAPI + OpenCV + imagehash)".
- **Development → First run note**: remove the entire paragraph about
  OpenCLIP downloading ViT-B/32 weights on first run.

## Size impact

Figures below are estimates; precise numbers require actually building the
installer (which is blocked on the paused release pipeline). The dominant
signal is the Python sidecar, where the removals are unambiguous.

**Python sidecar (uncompressed site-packages + bundled models on disk):**

| Component | Before | After |
|---|---|---|
| torch (CPU wheel) | ~600 MB | 0 |
| open-clip-torch + transitive (regex, ftfy, tqdm, sentencepiece, tokenizers, …) | ~150–250 MB | 0 |
| SFace model file | 37 MB | 0 |
| numpy / opencv-python-headless / pillow / fastapi / uvicorn / imagehash | ~200 MB | ~200 MB (unchanged) |
| YuNet model file | 230 KB | 230 KB (unchanged) |
| **Python sidecar total** | **~1.0–1.1 GB** | **~200 MB** |

**Total Windows installer (rough estimate):** ~1.3 GB → ~500 MB. Real numbers
will land somewhere in the 400–700 MB range depending on NSIS LZMA settings
and what we discover about transitive dep sizes when we actually run
`uv sync` in CI. The qualitative outcome — "moves from indie-3D-game
territory into indie-desktop-app territory" — is robust regardless of where
exactly the final figure lands.

## Acceptance criteria

- [ ] `cd py-sidecar && uv sync` produces a `.venv` with no torch present
  (`uv pip list | grep -i torch` returns nothing).
- [ ] `cd py-sidecar && uv run pytest` passes — the remaining tests
  (`test_app.py`, `test_blur.py`, `test_exposure.py`, `test_faces.py`,
  `test_phash.py`) cover the surface we keep.
- [ ] `cd sidecar && npm test` passes.
- [ ] `cd src-tauri && cargo test` passes.
- [ ] `npx playwright test` passes (UI smoke).
- [ ] App launches against a fresh user database: index a folder, run CV
  pass, auto-select album, review pages, export PDF — all without errors
  and without invoking the deleted `/embed` or `/tags` routes.
- [ ] Migrations 024 and 025 run cleanly on any existing development
  database (the project's own dev DB; if `ALTER TABLE DROP COLUMN` is
  unsupported, the fallback rebuild path described above is implemented
  instead).
- [ ] `aggregateScore()` signature is reduced to four required signal
  sources: `cv`, `facesForPhoto`, `isDuplicateNonRep` — no `tagsForPhoto`,
  no `pinnedClusterIds`.
- [ ] README accurately reflects the slimmer pipeline; no stale mentions of
  OpenCLIP, scene tagging, SFace, or face clustering remain.
- [ ] Cleanup grep returns no matches:
  `git grep -i "open_clip\|openclip\|open-clip\|sface\|image_embedding\|photo_tag\|person_cluster\|score_tags\|embed_image\|face_embed\|face-clustering\|pinned_person\|tagsForPhoto" -- ':!docs/'`

## Related decisions

- **LLM captions retired** — text overlays cover the use case; spec doc
  collapses Phase 4 to the already-shipped PDF export.
- **Release pipeline paused mid-design** — resumes after this CV shrinkdown
  lands. Locked-in decisions (Windows x64, unsigned, no auto-update, GHA on
  `v*` tags, bake the Python `.venv` at build time, ship `node.exe` +
  sidecar `node_modules` as Tauri resources) carry forward unchanged. With
  CV shrinkdown, the planned installer drops from ~1.6 GB to ~860 MB.
