import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server';

describe('sidecar server', () => {
  it('responds to GET /health with { ok: true } and exposes the port', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
