import { describe, it, expect, afterAll } from 'vitest';
import { readExif, closeExif } from '../src/exif';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE = resolve(__dirname, '../fixtures/sample.jpg');
const NOEXIF = resolve(__dirname, '../fixtures/sample-noexif.jpg');

afterAll(async () => { await closeExif(); });

describe('exif.readExif', () => {
  it('returns ISO date string, dimensions, and orientation', async () => {
    const r = await readExif(SAMPLE);
    expect(r.taken_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof r.width).toBe('number');
    expect(typeof r.height).toBe('number');
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
    expect([1, 3, 6, 8, null]).toContain(r.orientation);
    expect(typeof r.exif_json).toBe('string');
    expect(() => JSON.parse(r.exif_json!)).not.toThrow();
  });

  it('returns null taken_at for missing-EXIF photos without throwing', async () => {
    const r = await readExif(NOEXIF);
    expect(r.taken_at).toBeNull();
    expect(r.width).toBeGreaterThan(0); // dimensions come from JPEG header
  });
});
