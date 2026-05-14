# Family Album & Calendar Builder Design Spec

**Date:** 2026-05-14
**Status:** Brainstorming → ready for writing-plans
**Project repo (planned):** `../slop-family-album/` (not yet bootstrapped)
**Vetted entry:** `VETTED.md` → Family Album & Calendar Builder (Local)

## Summary

A local-first desktop app (Tauri v2 + SvelteKit) that takes a folder of a year's family photos and produces two print-ready PDFs: a chronological photo album, and a 12-month wall calendar in **seasonal-memory mode** (each calendar month features photos from that same month a year earlier). The curation work is done by a deterministic CV + scoring pipeline running locally; an optional local LLM (Gemma 4 E4B via Ollama) writes captions and titles. No photo leaves the machine in the default path.

**Core decisions:**

- **Local-first by construction.** Photos, embeddings, scores, faces, and outputs all live on disk. No SaaS, no cloud upload. Optional cloud LLM (Claude) for captions only, opt-in, per-session toggle, never auto-enabled.
- **AI is not the engine.** Photo selection is deterministic scoring + explicit constraints. The LLM is decorative — captions, titles, month headers — and the app produces a complete album even with the LLM disabled.
- **Two outputs from one pipeline.** Index + score once; emit album (chronological) and calendar (seasonal-memory) from the same selection pool with different filters and layouts.
- **Templates over generative layout.** v1 ships ~8 fixed page templates and chooses among them by photo count + orientation mix. Generative layout is v2 and may never earn its cost.
- **Python sidecar for CV.** Tauri spawns a Python process on launch; JS talks to it via HTTP on a random localhost port. Move stable pieces to Rust/ONNX later if perf demands.
- **Constraints as TOML config in v1.** A human-readable `album.toml` per project. v2 adds a UI for the most-edited fields (must-include people, weights, banned tags). TOML first because Claude-as-collaborator can edit it; UI later because annual-use end-users will want one.
- **sRGB high-DPI PDFs in v1.** True print-shop fidelity (PDF/X + CMYK + ICC profiles) is v2. v1 warns on low-resolution images; v1 does not promise photo-shop-grade output.

## Context

Three frictions drive this build (full reasoning in `VETTED.md`):
1. Uploading a year of kids/home interiors to US SaaS is uncomfortable.
2. Existing services (Journi, Motif/Mimeo, Mixbook) hide their curation rules.
3. **Seasonal-memory** calendar structure — January page shows last January's photos — is structurally correct for a year-in-review wall product but uncommon in shipping tools.

Shipping alternatives and why they don't fit:

| Tool | Why it doesn't fill the slot |
|---|---|
| Journi | Cloud-only. AI curation but rules opaque. No seasonal-memory calendar. |
| Motif / Mimeo | Cloud-only. Best-of-breed AI curation but US-centric, Apple-tied. |
| Mixbook | Cloud-only. Good design, slow EU shipping. No seasonal-memory mode. |
| Apple Photos / Google Photos auto-memories | No print pipeline. No constraint expression. No calendar mode. |
| Immich, PhotoPrism, PhotoStructure | Browsing/search managers. No "produce curated printed artifact" pipeline. |
| Canva | Manual layout. No curation. No "year of photos → book" flow. |

The combination "local + constraint-expressible curation + seasonal-memory calendar + print-ready PDF" doesn't exist as a shipping product.

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Desktop shell | **Tauri v2** | Matches existing Rust-friendly slop direction. Smaller bundle than Electron. Native filesystem access without web-API friction. |
| UI | **SvelteKit + Svelte 5** | Matches `STYLE.md` and the slop UI conventions. SSR/static — Tauri serves the SPA build. |
| Styling | **Tailwind v4 + IBM Plex Mono** | Per `STYLE.md`. |
| State / persistence | **SQLite** via `tauri-plugin-sql` | Single `app.sqlite` per project. Easy to inspect with any SQLite viewer. |
| Image processing | **Sharp** (libvips) in Node sidecar, OR Rust `image` crate | Thumbnailing, JPEG/HEIC decoding, EXIF orientation handling. Start with Sharp via Node sidecar for speed of dev; revisit Rust later. |
| EXIF | **ExifTool** via `execSync` | Most reliable EXIF reader, handles HEIC/RAW. Bundled or assumed on PATH. |
| CV pipeline | **Python sidecar** | Face detection (`insightface` or `face_recognition`), embeddings (`open_clip`), blur (`opencv-python` Laplacian variance), perceptual hash (`imagehash`). |
| Local LLM (optional) | **Ollama + Gemma 4 E4B** | Captions, titles, month headers. App detects Ollama at startup; if absent, LLM features hide. |
| Cloud LLM (optional) | **Claude via Anthropic SDK** | Opt-in per session. Higher-quality captions. Off by default. |
| PDF | **Paged.js** (HTML/CSS print pipeline) | Album: rich layouts. Calendar: simpler page-grid. Paged.js compiles HTML+CSS to print-paginated PDF. |
| Build | **Tauri's bundler** + **Vite** | Standard Tauri v2 setup. |
| Testing | **Vitest** (UI logic) + **pytest** (Python CV) + fixture-based integration test on a small photo set | |

## Repo Layout

```
slop-family-album/
├── src-tauri/                  # Rust shell
│   ├── src/main.rs             # Tauri entry: spawn sidecars, expose IPC
│   ├── tauri.conf.json
│   └── Cargo.toml
├── src/                        # SvelteKit UI
│   ├── routes/
│   │   ├── +page.svelte                  # Project picker (new / open)
│   │   ├── projects/[id]/+page.svelte    # Project dashboard
│   │   ├── projects/[id]/library/        # Indexed-photo browser
│   │   ├── projects/[id]/album/          # Album review + reorder
│   │   ├── projects/[id]/calendar/       # Calendar review + reorder
│   │   └── projects/[id]/export/         # PDF export options
│   ├── lib/
│   │   ├── components/                   # PageHeader, ThemeToggle, etc. (from STYLE.md)
│   │   ├── db/                           # SQLite wrappers, typed queries
│   │   ├── cv/                           # CV-sidecar HTTP client
│   │   ├── llm/                          # Ollama + Claude clients
│   │   ├── scoring/                      # Score functions (TS — fast, no sidecar)
│   │   ├── selection/                    # Constraint solver, monthly bucketing
│   │   ├── layout/                       # Template picker, page composition
│   │   └── export/                       # Paged.js PDF generation
│   └── app.css                           # Per STYLE.md
├── python/                     # CV sidecar
│   ├── server.py               # FastAPI app, /detect-faces, /embed, /blur, /phash
│   ├── pipeline.py             # Orchestrates per-photo CV pass
│   ├── pyproject.toml
│   └── tests/
├── examples/
│   └── tiny-album/             # 50-photo fixture set + reference album.toml
├── README.md
└── package.json
```

## Architecture

### Components

```
┌──────────────────────────────────────────────────────────────┐
│  Tauri shell (Rust)                                          │
│   - spawns Node sidecar + Python sidecar at startup          │
│   - exposes IPC for FS ops the renderer can't do directly    │
└──────────────────────────────────────────────────────────────┘
        │                                    │
        ▼                                    ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Node sidecar        │         │  Python sidecar      │
│  (Sharp, ExifTool)   │         │  (OpenCV, OpenCLIP,  │
│  HTTP localhost:N    │         │   InsightFace)       │
│   /thumb /exif       │         │  HTTP localhost:M    │
└──────────────────────┘         │   /detect-faces      │
                                  │   /embed /blur /phash│
                                  └──────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────┐
│  SvelteKit renderer                                          │
│  - Indexing UI                                               │
│  - Library/review UI                                         │
│  - Album/calendar review                                     │
│  - Export UI                                                 │
│  - Talks to sidecars via fetch(); reads/writes SQLite        │
│    via tauri-plugin-sql                                      │
└──────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────┐
│  Project dir on disk                                         │
│  └── <project>/                                              │
│      ├── album.toml         (constraints, weights)           │
│      ├── app.sqlite         (index, scores, selections)      │
│      ├── thumbs/            (cached thumbnails)              │
│      ├── faces/             (face crops for clustering UI)   │
│      └── exports/                                            │
│          ├── album.pdf                                       │
│          └── calendar.pdf                                    │
└──────────────────────────────────────────────────────────────┘
```

### Unit boundaries

- **Indexing pipeline** (`scoring/`, `cv/` client): photos → SQLite rows + thumbnails + scores. Idempotent, resumable. Replaceable without touching UI.
- **Selection layer** (`selection/`): SQLite + `album.toml` → ordered list of `(photo_id, month, page_target)` rows. Pure function over indexed state.
- **Layout engine** (`layout/`): selection → page list with template assignments. Pure function.
- **Export** (`export/`): page list → PDF via Paged.js. Renderable to preview HTML for in-app review.
- **UI** is read-mostly against typed query results; writes go through small command modules.

Each unit is testable in isolation against fixtures.

## Data Model

SQLite schema (sketch — final schema settled during implementation):

```sql
-- One project = one year's album/calendar.
CREATE TABLE project (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  source_dir TEXT NOT NULL,
  album_year INTEGER NOT NULL,         -- e.g. 2025 (the year photographed)
  calendar_year INTEGER NOT NULL,      -- e.g. 2026 (the wall year; album_year+1 by default)
  created_at INTEGER NOT NULL
);

CREATE TABLE photo (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES project(id),
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  taken_at INTEGER,                    -- EXIF DateTimeOriginal or file mtime fallback
  width INTEGER, height INTEGER,
  orientation INTEGER,                 -- 1/3/6/8 EXIF
  exif_json TEXT,                      -- full EXIF as JSON
  UNIQUE (project_id, sha256)
);

CREATE TABLE score (
  photo_id INTEGER PRIMARY KEY REFERENCES photo(id),
  blur REAL,                           -- Laplacian variance, higher = sharper
  exposure REAL,                       -- 0..1 centered-histogram score
  composition REAL,                    -- placeholder for v2 rule-of-thirds etc; v1 = 0.5
  is_screenshot INTEGER,               -- 0/1 (detected via aspect + EXIF absence)
  is_document INTEGER,                 -- 0/1 (detected via OpenCLIP zero-shot)
  faces_count INTEGER,
  faces_quality REAL,                  -- mean per-face quality (eyes-open, size)
  uniqueness REAL,                     -- 1 - max(cosine similarity to other photos)
  computed_at INTEGER
);

CREATE TABLE phash (
  photo_id INTEGER PRIMARY KEY REFERENCES photo(id),
  hash BLOB NOT NULL                   -- 64-bit pHash
);

CREATE TABLE embedding (
  photo_id INTEGER PRIMARY KEY REFERENCES photo(id),
  vector BLOB NOT NULL                 -- OpenCLIP image embedding, f32
);

CREATE TABLE face (
  id INTEGER PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES photo(id),
  bbox_json TEXT NOT NULL,
  embedding BLOB NOT NULL,
  cluster_id INTEGER REFERENCES person_cluster(id),
  quality REAL                         -- detector confidence + face size
);

CREATE TABLE person_cluster (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES project(id),
  name TEXT,                           -- user-provided ('Grandma', 'Liis'); null = unnamed
  is_pinned INTEGER DEFAULT 0          -- always-include-when-present
);

CREATE TABLE duplicate_group (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  representative_photo_id INTEGER REFERENCES photo(id)
);

CREATE TABLE duplicate_group_member (
  group_id INTEGER NOT NULL REFERENCES duplicate_group(id),
  photo_id INTEGER NOT NULL REFERENCES photo(id),
  PRIMARY KEY (group_id, photo_id)
);

-- Zero-shot scene tags from OpenCLIP, computed during indexing against a
-- fixed prompt list (e.g. 'outdoor', 'indoor', 'beach', 'snow', 'food',
-- 'birthday', 'portrait'). Used for season-aware calendar filtering and
-- as caption-LLM context.
CREATE TABLE photo_tag (
  photo_id INTEGER NOT NULL REFERENCES photo(id),
  tag TEXT NOT NULL,
  score REAL NOT NULL,                 -- softmax score 0..1
  PRIMARY KEY (photo_id, tag)
);

-- A 'selection' is the canonical ordering for one output.
CREATE TABLE selection (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  kind TEXT NOT NULL,                  -- 'album' or 'calendar'
  generated_at INTEGER
);

CREATE TABLE selected_photo (
  selection_id INTEGER NOT NULL REFERENCES selection(id),
  photo_id INTEGER NOT NULL REFERENCES photo(id),
  bucket_key TEXT NOT NULL,            -- album: ISO date 'YYYY-MM-DD'; calendar: 'YYYY-MM'
  rank INTEGER NOT NULL,               -- order within bucket
  user_state TEXT NOT NULL DEFAULT 'auto',   -- 'auto' | 'pinned' | 'rejected'
  PRIMARY KEY (selection_id, photo_id)
);

CREATE TABLE page (
  id INTEGER PRIMARY KEY,
  selection_id INTEGER NOT NULL REFERENCES selection(id),
  index_in_book INTEGER NOT NULL,
  template_id TEXT NOT NULL,
  title TEXT,
  body TEXT                            -- caption / month header (LLM-generated or hand-edited)
);

CREATE TABLE page_slot (
  page_id INTEGER NOT NULL REFERENCES page(id),
  slot_index INTEGER NOT NULL,
  photo_id INTEGER NOT NULL REFERENCES photo(id),
  PRIMARY KEY (page_id, slot_index)
);
```

## Indexing Pipeline

Triggered when the user opens or refreshes a project. Resumable: each step records progress, can be interrupted, picks up where it left off.

```
For each file in source_dir (recursive, filtered by extension):
  1. Skip if (path, sha256) already in `photo` table and mtime unchanged
  2. Compute sha256, write to `photo` (UNIQUE — handles duplicates by hash)
  3. ExifTool → exif_json, taken_at, orientation, dimensions
  4. Sharp → 256px thumbnail + 1024px preview (cached in thumbs/)
  5. Python sidecar:
     a. Blur score (Laplacian variance, normalized by image size)
     b. Exposure score (histogram centeredness)
     c. OpenCLIP embedding
     d. InsightFace face detection + face embeddings + bbox + quality
     e. Perceptual hash (pHash)
     f. Zero-shot OpenCLIP tag scoring against a fixed prompt list
        (is_screenshot, is_document, indoor/outdoor, season hints,
        scene labels) → photo_tag rows
  6. Write rows to score, embedding, face, phash, photo_tag
After all photos:
  7. Cluster faces (Chinese-whispers or DBSCAN over face embeddings) → person_cluster
  8. Detect duplicate groups (pHash Hamming ≤ 6 OR embedding cosine ≥ 0.97) → duplicate_group
  9. Compute `uniqueness` per photo = 1 - max(cosine sim within project)
 10. Mark progress complete; UI unlocks selection step.
```

Throughput will be measured during implementation on a representative library; no target committed in v1. Mitigation knobs available if indexing is slow: skip face detection / embeddings on a first pass for very large libraries (10k+) and enable in a second pass once a rough selection is happy; GPU/MPS acceleration for the Python sidecar where available.

## Scoring System

The per-photo score determines what's eligible. **All weights live in `album.toml`** so the user (or Claude) can re-tune without rebuilding.

```toml
# album.toml

[score.weights]
sharpness     = 1.0
exposure      = 0.5
faces_quality = 1.5
faces_count   = 0.3   # diminishing returns; capped at 4
uniqueness    = 1.0
composition   = 0.0   # v1 placeholder

[score.penalties]
blur            = 2.0   # heavy
screenshot      = 5.0   # near-exclude
document        = 5.0
duplicate_extra = 1.5   # applied to all but representative in a group
```

Final score: weighted sum of normalized features minus penalties. Photos below a floor threshold are excluded from selection entirely (but still browsable in the library view).

Faces quality combines:
- Face size (a tiny face in the corner counts less than a centered close-up)
- Detector confidence
- Eyes-open / not-blurry sub-signals from InsightFace landmarks (v1 = simple thresholds; v2 = trained classifier)

## Constraint Layer & Selection

```toml
# album.toml

[album]
target_pages = 40              # ±5 acceptable
target_per_event = 3           # max photos per day-cluster, soft
target_per_month = 5           # soft floor
must_include = ['Grandma']     # person_cluster names — always include when present
people_balance = true          # try to spread named clusters across pages

[calendar]
year = 2026                    # the calendar year (defaults to album_year + 1)
mode = 'seasonal-memory'       # | 'best-of'
photos_per_month = 1           # how many photos appear on each month page
require_outdoor_summer = true  # June–Aug prefer outdoor scenes (OpenCLIP zero-shot tag)
```

### Selection algorithm caveats

v1 selection is a **best-effort greedy pass** with constraint-aware reordering, not an optimal solver. If "people balance" or "event coverage" quality is poor in practice, v2 may move to a real ILP (Z3 / OR-tools). The greedy algorithm is documented below; it converges deterministically and re-runs in <1s on indexed data, which makes it cheap to re-trigger after the user edits `album.toml`.

`must_include` constraints reference `person_cluster.name`, which means the user must have **named the relevant clusters** before the constraint takes effect. Unnamed clusters are ignored by `must_include`. The UI flow surfaces unnamed-cluster review as a prerequisite step before generating an album when `must_include` is non-empty.

### Album selection algorithm

1. **Bucket by day.** Photos → `bucket_key = taken_at.date()`.
2. **Per-bucket top-K.** Within each day, take top `target_per_event` photos by score.
3. **Aggregate by month.** Concatenate all day-tops into monthly pools.
4. **Apply must-include.** Add any photo containing a `must_include` person cluster (capped per day to avoid over-representation).
5. **Soft monthly floor.** If a month has fewer than `target_per_month`, pull additional photos from that month's library pool by score until the floor is met or pool exhausted.
6. **Page budget.** If total selected exceeds page budget × per-page-photo-average, drop lowest-scoring non-must-include photos until under budget. If under, pull more.
7. **People balance.** If `people_balance`, downweight selections that cluster a single person on consecutive pages by adjusting rank within month.
8. **Materialize.** Write rows to `selection` (kind='album') and `selected_photo` with `rank` within `bucket_key = 'YYYY-MM-DD'`.

### Calendar selection (seasonal-memory mode)

For each calendar month `M` of `calendar_year`:
1. Pull all photos with `taken_at.month == M` and `taken_at.year == calendar_year - 1`.
2. Apply scoring + must-include + duplicate-suppression.
3. Take top `photos_per_month`.
4. Tag-bias (optional): for summer months, require / boost photos matching outdoor-scene tags via stored OpenCLIP zero-shot scores.
5. Materialize into `selection` (kind='calendar') with `bucket_key = 'YYYY-MM'`.

If a month has fewer photos than `photos_per_month`, the UI flags it ("November has only 2 photos — consider broadening the date range or adjusting filters"). v1 does NOT silently borrow from adjacent months — user owns the decision.

## Layout Engine

Templates are HTML/CSS fragments stored as static files. Each declares constraints in frontmatter-like comments.

**v1 ships these templates:**

| ID | Slots | Best for | Notes |
|---|---|---|---|
| `hero-1` | 1 | Single great photo | Full-bleed |
| `pair-portrait` | 2 | Two portraits | Vertical split |
| `pair-landscape` | 2 | Two landscapes | Horizontal split |
| `trio-asym` | 3 | One hero + 2 supporting | Hero left, two stacked right |
| `quad-grid` | 4 | Four-of-a-kind event | 2×2 |
| `six-grid` | 6 | Dense event coverage | 3×2 |
| `pano-band` | 1 | Wide panoramas | Full-bleed wide |
| `month-divider` | 0 | Month section break | Title only, optional small motif image |

**Template picker** (per page bucket):

```
Inputs: photo list for this bucket (1..N), orientations, scores
Algorithm:
  if N == 1 and aspect_ratio > 2.2:   → pano-band
  elif N == 1:                         → hero-1
  elif N == 2 and both portrait:       → pair-portrait
  elif N == 2 and both landscape:      → pair-landscape
  elif N == 3:                         → trio-asym (hero = highest score)
  elif N == 4:                         → quad-grid
  elif N >= 5:                         → six-grid (drop lowest until N=6)
Insert `month-divider` between months.
```

The picker is deterministic and easy to override per-page in the review UI.

## PDF Export

**Paged.js** consumes a generated HTML document (one `<section class="page">` per page) with print CSS:

```css
@page {
  size: 210mm 210mm;        /* square album default; user-selectable */
  margin: 0;
  marks: none;
}
.page {
  width: 210mm;
  height: 210mm;
  page-break-after: always;
}
.bleed { padding: 3mm; }    /* safe area inside 3mm bleed */
```

Page sizes available v1:
- **Square 21×21cm** (album default — matches most EU print-on-demand)
- **A4 landscape** (calendar default)
- **A4 portrait** (album alternative)

Image rendering:
- All photos embedded at sufficient resolution for **300 DPI** at the slot's printed size.
- Photos under 300 DPI for their slot are flagged before export: "12 photos will print at < 200 DPI — review or replace."
- sRGB color space (no ICC profile embedding in v1).
- 3mm bleed on full-bleed templates.

Export produces:
- `exports/album.pdf`
- `exports/calendar.pdf`
- `exports/export-report.json` (low-res warnings, missing-EXIF photos, manual swaps log)

## LLM Layer (Optional)

Three uses, all optional:

| Use | Surface | Prompt shape |
|---|---|---|
| Month headers | Calendar | "Write a 2–4 word header for a wall-calendar page for month X (year N), given these photos: [list of brief auto-tags]" |
| Section titles | Album | "Write a 3–6 word warm title for a photo-album spread covering: [list of auto-tags]" |
| Captions | Both | "Write a single-sentence caption (max 80 chars) for this scene: [auto-tags]. Tone: warm, present-tense, no clichés." |

App detects:
- **Ollama** on launch via `GET http://localhost:11434/api/tags`. If found and `gemma4:e4b` is installed (or the user has approved auto-install), LLM features are enabled.
- **Claude** is opt-in via Settings → "Use Claude for captions (sends image descriptions, not images, to Anthropic)". Off by default.

If neither is available, the app produces albums with empty titles/captions (user can hand-write). The album is never blocked by LLM availability.

**Important:** the LLM is given OpenCLIP auto-tags + scene descriptors, **not the raw photo bytes**, in the default Ollama path. This keeps even captioning fully local in the Ollama case (Gemma 4 is multimodal, but the default uses text-only to avoid per-photo cost and keep latency predictable). v2 may enable per-photo VLM calls for higher quality.

## UI Flow

```
Project picker
  └─> New project: pick source folder → name → year
       └─> Project dashboard
            ├─ "Index library" (progress bar, can pause)
            ├─ "Browse photos" → filterable grid (by month, person, score, tag)
            ├─ "Cluster people" → review face clusters, name them
            ├─ "Album" → generated selection → page-by-page review
            │    Each page: thumbnails of slot fills, swap/pin/reject, template override
            │    "Show alternatives for this slot" → top-N candidates from same bucket
            │    Title field (LLM-suggested if available, hand-editable)
            ├─ "Calendar" → 12 month tiles → same review affordances
            └─ "Export" → page size, output paths, "Generate album.pdf + calendar.pdf"
                  → preview pane (Paged.js rendered HTML)
                  → "Open in default PDF app"
```

The review steps are where the human stays in the loop — the whole point is that auto-curation is a strong first draft, not the final word.

## v1 Scope

**In:**
- Tauri desktop app (macOS + Linux). Windows post-v1.
- Index → score → cluster → dedup pipeline for JPEG, HEIC, PNG.
- TOML-based constraint configuration.
- Album selection (chronological, constraint-aware).
- Calendar selection (seasonal-memory mode only).
- 8 layout templates listed above.
- Person clustering UI with manual rename.
- Page review UI with swap/pin/reject and template override.
- Paged.js PDF export for album + calendar (sRGB, 300 DPI, 3mm bleed).
- Optional Ollama + Gemma 4 E4B captions/titles. Optional Claude opt-in.
- Fixture test set (~50 photos, reference `album.toml`, expected selection snapshot).

**Out (deferred to v2+):**
- Windows support.
- RAW format ingestion (CR2, NEF, ARW).
- Video frames as album sources.
- Constraint editing UI (config-only in v1).
- 'best-of' calendar mode (only seasonal-memory in v1).
- Multi-year libraries / cross-year selection.
- Photo memory across years ("show me what we usually do in summer").
- True print-shop fidelity (PDF/X, CMYK, ICC profiles).
- Generative / AI-suggested page layouts.
- Per-photo VLM captioning (using image bytes).
- EU print-on-demand integration (one-click order from the app).
- Cloud sync of project state across devices.
- i18n. UI hardcoded English; LLM prompts English; user-provided titles/captions can of course be any language. v2 adds the standard slop i18n pattern (see `VETTED.md` cross-cutting note).

## Open Questions

- **Face library choice.** `face_recognition` (built on dlib) is permissive but accuracy is older-generation. `insightface` is much better but model-licensing terms need a careful read if the app is ever distributed; personal-use should be fine. Lean towards `insightface` with a clearly-marked "personal use" license note in the README; revisit if distribution becomes a goal.
- **HEIC handling.** macOS-native HEIC photos are common. Sharp supports HEIC via libheif, but bundling libheif into Tauri may require platform-specific builds. Acceptable v1 trade-off: assume libheif is on the system (via `brew install libheif`); document it; warn if missing.
- **OpenCLIP vs SigLIP for embeddings.** SigLIP is generally stronger but heavier; OpenCLIP B/32 is fast and good enough for dedup + tag matching. Start with OpenCLIP B/32; upgrade if dedup quality fails fixture tests.
- **Paged.js performance at book scale.** A 40-page album with 100+ embedded photos may stress Paged.js. If page-rendering times exceed ~30s, fall back to per-page PDF generation + concatenation via a small Rust helper.
- **Project portability.** SQLite + thumbs + TOML in a project dir is self-contained — does the user want a way to zip and move it? Probably yes; trivial to add post-v1.

## Out of Scope (Explicit)

- **No cloud upload of photo bytes.** Ever, in the default path. The Claude opt-in sends text descriptors only, not photos.
- **No accounts.** Local-only app; no auth.
- **No mobile.** Desktop-only. Annual cadence + bulk photo library + print orientation argue against mobile.
- **No competition with Journi/Motif/Mixbook for the mass market.** This is a build-for-yourself tool that scratches a specific itch; positioning is "the album you'd build if you cared about privacy and control and were willing to install something."
- **No "AI does the whole thing" claim.** The marketing — to the extent there is any — leads with "deterministic curation you can read, with optional AI captions."
