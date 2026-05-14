import Fastify, { type FastifyInstance } from 'fastify';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
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

// Auto-start when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error('SIDECAR_FAIL', err);
    process.exit(1);
  });
}
