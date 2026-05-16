-- One row per page in the album/calendar. Pages are ordered by
-- index_in_book within their selection. Re-generating a selection
-- creates a fresh set of pages (ON DELETE CASCADE from selection
-- handles cleanup of stale pages).
CREATE TABLE page (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  selection_id INTEGER NOT NULL REFERENCES selection(id) ON DELETE CASCADE,
  index_in_book INTEGER NOT NULL,
  template_id TEXT NOT NULL,
  title TEXT,
  body TEXT
);

CREATE INDEX idx_page_selection ON page (selection_id, index_in_book);

-- One row per photo slot within a page. slot_index 0-based.
-- photo_id is nullable so an empty slot (e.g., calendar fallback that
-- failed) can be persisted. transform_json reserved for Phase 3c
-- (drag-to-reposition / scroll-to-zoom).
CREATE TABLE page_slot (
  page_id INTEGER NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  photo_id INTEGER REFERENCES photo(id) ON DELETE SET NULL,
  transform_json TEXT,
  PRIMARY KEY (page_id, slot_index)
);
