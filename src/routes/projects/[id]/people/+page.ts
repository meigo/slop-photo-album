import {
  getProject, listPersonClusters, listFacesByProject, listPhotos,
} from '$lib/db';
import { error } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

export async function load({ params }) {
  const id = Number(params.id);
  const project = await getProject(id);
  if (!project) throw error(404, 'Project not found');
  const clusters = await listPersonClusters(id);
  const faces = await listFacesByProject(id);
  const photos = await listPhotos(id);
  const photoById = new Map(photos.map((p) => [p.id, p]));

  // Group faces by cluster_id (null included)
  const facesByCluster = new Map<number | null, typeof faces>();
  for (const f of faces) {
    const key = f.cluster_id;
    if (!facesByCluster.has(key)) facesByCluster.set(key, []);
    facesByCluster.get(key)!.push(f);
  }

  return { project, clusters, facesByCluster, photoById };
}
