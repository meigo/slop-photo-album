import { invoke } from '@tauri-apps/api/core';

let _port: number | null = null;

export async function pySidecarPort(): Promise<number> {
  if (_port !== null) return _port;
  for (let i = 0; i < 120; i++) {  // 120 × 500ms = 60s
    const p = await invoke<number | null>('py_sidecar_port');
    if (p) { _port = p; return p; }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Python sidecar did not start within 60s');
}

async function pyFetch<T>(path: string, body?: unknown): Promise<T> {
  const port = await pySidecarPort();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Py sidecar ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export interface PyFaceBox { x: number; y: number; w: number; h: number; quality: number; }

export async function blurViaPy(
  path: string,
  faces?: ReadonlyArray<PyFaceBox>,
): Promise<number> {
  const body: { path: string; faces?: ReadonlyArray<PyFaceBox> } = { path };
  if (faces && faces.length > 0) body.faces = faces;
  const r = await pyFetch<{ blur: number }>('/blur', body);
  return r.blur;
}

export async function phashViaPy(path: string): Promise<string> {
  const r = await pyFetch<{ phash: string }>('/phash', { path });
  return r.phash;
}

export async function facesViaPy(path: string): Promise<{ count: number; faces: PyFaceBox[] }> {
  return pyFetch<{ count: number; faces: PyFaceBox[] }>('/faces', { path });
}

export async function exposureViaPy(path: string): Promise<number> {
  const r = await pyFetch<{ exposure: number }>('/exposure', { path });
  return r.exposure;
}
