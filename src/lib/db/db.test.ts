// @ts-nocheck
// This test runs only inside a Tauri webview context where @tauri-apps/plugin-sql works.
// We skip it in plain Node/vitest; it's run from the Playwright e2e (Task 13).
import { describe, it } from 'vitest';
describe.skip('db (tauri-only)', () => {
  it('skipped outside Tauri', () => {});
});
