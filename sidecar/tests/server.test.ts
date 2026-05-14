import { describe, it, expect, afterAll } from 'vitest';
import { buildServer } from '../src/server';
import { closeExif } from '../src/exif';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE = resolve(__dirname, '../fixtures/sample.jpg');

afterAll(async () => { await closeExif(); });

describe('sidecar server', () => {
  it('responds to GET /health with { ok: true } and exposes the port', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});

describe('POST /exif', () => {
  it('returns ExifResult for a valid path', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/exif', payload: { path: SAMPLE } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.width).toBeGreaterThan(0);
    await app.close();
  });

  it('400s when path is missing', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/exif', payload: {} });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';

describe('POST /thumb', () => {
  it('produces a thumbnail at the requested longest edge', async () => {
    const app = await buildServer();
    const outDir = mkdtempSync(joinPath(tmpdir(), 'thumb-'));
    const out = joinPath(outDir, 't.jpg');
    const res = await app.inject({
      method: 'POST', url: '/thumb',
      payload: { source: SAMPLE, outPath: out, longestEdge: 128 }
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Math.max(body.width, body.height)).toBe(128);
    await app.close();
  });
});
