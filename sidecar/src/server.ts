import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { pathToFileURL } from 'node:url';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  // Allow the Tauri renderer (origin http://localhost:1420 in dev, tauri:// in
  // prod) to call us. Safe because we bind to 127.0.0.1 only — nothing
  // external can reach us regardless of origin.
  await app.register(cors, { origin: true });
  app.get('/health', async () => ({ ok: true }));

  app.post<{ Body: { path: string } }>('/exif', async (req, reply) => {
    const { path } = req.body ?? { path: '' };
    if (!path || typeof path !== 'string') {
      reply.code(400);
      return { error: 'path required' };
    }
    const { readExif } = await import('./exif.js');
    try {
      return await readExif(path);
    } catch (err) {
      reply.code(500);
      return { error: String(err) };
    }
  });

  app.post<{ Body: { source: string; outPath: string; longestEdge?: number } }>('/thumb', async (req, reply) => {
    const { source, outPath, longestEdge } = req.body ?? ({} as { source?: string; outPath?: string; longestEdge?: number });
    if (!source || !outPath) {
      reply.code(400);
      return { error: 'source and outPath required' };
    }
    const { makeThumbnail } = await import('./thumb.js');
    try {
      return await makeThumbnail(source, outPath, longestEdge ?? 256);
    } catch (err) {
      reply.code(500);
      return { error: String(err) };
    }
  });

  return app;
}

export async function startServer(): Promise<{ port: number; app: FastifyInstance }> {
  const app = await buildServer();
  // Bind to 127.0.0.1 only — never expose externally.
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const port = Number(new URL(address).port);
  // Print port to stdout in a structured form so Tauri can parse it.
  console.log(`SIDECAR_READY ${port}`);
  return { port, app };
}

// Auto-start when invoked directly. Use `pathToFileURL` so the comparison
// handles Windows backslash paths correctly (raw string concat produces
// `file://D:\…` while `import.meta.url` is `file:///D:/…`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((err) => {
    console.error('SIDECAR_FAIL', err);
    process.exit(1);
  });
}
