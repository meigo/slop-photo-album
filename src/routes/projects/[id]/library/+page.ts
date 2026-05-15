import { getProject, listPhotos, listCvScoresByProject, listDuplicateMembersByPhoto, listTopTagByPhoto } from '$lib/db';
import { error } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

export async function load({ params }) {
  const id = Number(params.id);
  const project = await getProject(id);
  if (!project) throw error(404, 'Project not found');
  const photos = await listPhotos(id);
  const cvs = await listCvScoresByProject(id);
  const dupGroupByPhoto = await listDuplicateMembersByPhoto(id);
  const topTagByPhoto = await listTopTagByPhoto(id);
  const cvById = new Map(cvs.map((c) => [c.photo_id, c]));
  return { project, photos, cvById, dupGroupByPhoto, topTagByPhoto };
}
