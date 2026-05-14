import { describe, it, expect } from 'vitest';
import { makeThumbnail } from '../src/thumb';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE = resolve(__dirname, '../fixtures/sample.jpg');

describe('thumb.makeThumbnail', () => {
  it('writes a 256px-longest-edge JPEG, returns its dimensions', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'thumb-'));
    const outPath = join(outDir, 'thumb.jpg');
    const r = await makeThumbnail(SAMPLE, outPath, 256);
    expect(existsSync(outPath)).toBe(true);
    expect(statSync(outPath).size).toBeGreaterThan(0);
    expect(Math.max(r.width, r.height)).toBe(256);
    expect(r.path).toBe(outPath);
  });
});
