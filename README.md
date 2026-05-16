# slop-family-album

Local-first desktop app for building printed family photo albums and seasonal-memory wall calendars from a year of family photos.

## Status

**Phase 1 (Foundation) — complete.** Index folder → SQLite with thumbnails + EXIF, library grid.

**Phase 2a (CV pipeline) — complete.** Blur + face detection + perceptual hash; pHash duplicate groups.

**Phase 2b (Semantic CV) — complete.** OpenCLIP embeddings, scene tags, SFace face embeddings, exposure scoring. Face clustering retained in code but de-emphasized in v1 UX.

**Phase 3a (Selection) — complete.** Aggregate scoring + album/calendar selection. Year filter, per-month cap, adjacent-month fallback.

**Phase 3b (Layout + Review) — complete.** Auto-composed pages + visual review UI with popup picker. Click any slot to swap; scope (bucket/nearby/all) and sort (score/chronological/similarity) filters in the picker.

**Phase 3c (Review power) — complete.** Per-page template dropdown (10 album templates: single / pairs / trios / quads / six-grid), page reorder via up/down arrows, page delete. The user can fully restructure the auto-generated album.

Phase 3d (slot drag/zoom + auto-position from face data + per-photo adjustments) and Phase 4 (PDF export + LLM captions) are planned but not yet implemented.

See `docs/superpowers/specs/2026-05-14-family-album-builder-design.md` for the design.

## Development

Requires: Node ≥ 20, Rust toolchain (for Tauri v2), Python ≥ 3.11, `uv` (https://docs.astral.sh/uv/), `libheif` if you want HEIC support (`brew install libheif` on macOS).

```bash
npm install
cd sidecar && npm install && cd ..
cd py-sidecar && uv sync && cd ..
npm run tauri dev
```

**First run note:** The first time Tauri spawns the Python sidecar after `uv sync`, OpenCLIP downloads the ViT-B/32 weights (~150 MB) to `~/.cache/torch/hub/checkpoints/`. Allow a couple of minutes for the first `/embed` or `/tags` call to complete; subsequent runs are fast.

Run sidecar tests:

```bash
cd sidecar && npm test
```

Run Python sidecar tests:

```bash
cd py-sidecar && uv run pytest
```

Run Rust tests:

```bash
cd src-tauri && cargo test
```

UI smoke (non-Tauri):

```bash
npx playwright test
```

## Architecture

See `docs/superpowers/specs/2026-05-14-family-album-builder-design.md`.

Short version: Tauri v2 shell + SvelteKit renderer + SQLite + Node sidecar (Sharp + ExifTool) + Python sidecar (OpenCV + imagehash). All data stays local.
