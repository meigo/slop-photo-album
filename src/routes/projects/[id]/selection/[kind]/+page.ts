import { getProject, getCurrentSelection, listSelectedPhotos, listPhotos } from '$lib/db';
import { error } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

interface MonthStat {
  monthKey: string;       // 'YYYY-MM'
  available: number;       // photos in DB for this month + year
  selected: number;        // photos in current selection for this month
}

export async function load({ params }) {
  const id = Number(params.id);
  if (params.kind !== 'album' && params.kind !== 'calendar') {
    throw error(404, 'Unknown selection kind');
  }
  const kind: 'album' | 'calendar' = params.kind;
  const project = await getProject(id);
  if (!project) throw error(404, 'Project not found');
  const selection = await getCurrentSelection(id, kind);

  // Build available-per-month map from all indexed photos.
  // For album: year = project.album_year.
  // For calendar: year = project.calendar_year - 1 (source year).
  const allPhotos = await listPhotos(id);
  const yearFilter = kind === 'album' ? project.album_year : project.calendar_year - 1;
  const availableByMonth = new Map<string, number>();
  for (const p of allPhotos) {
    if (p.taken_at === null) continue;
    const d = new Date(p.taken_at);
    if (d.getFullYear() !== yearFilter) continue;
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const key = `${d.getFullYear()}-${m}`;
    availableByMonth.set(key, (availableByMonth.get(key) ?? 0) + 1);
  }

  let photosByBucket = new Map<string, Awaited<ReturnType<typeof listSelectedPhotos>>>();
  let selectedByMonth = new Map<string, number>();

  if (selection) {
    const photos = await listSelectedPhotos(selection.id);
    for (const p of photos) {
      const arr = photosByBucket.get(p.bucket_key) ?? [];
      arr.push(p);
      photosByBucket.set(p.bucket_key, arr);
      // For album: bucket_key = 'YYYY-MM-DD', take first 7 chars.
      // For calendar: bucket_key = 'YYYY-MM' already.
      const monthKey = p.bucket_key.length >= 7 ? p.bucket_key.slice(0, 7) : p.bucket_key;
      selectedByMonth.set(monthKey, (selectedByMonth.get(monthKey) ?? 0) + 1);
    }
  }

  // Histogram: merge available + selected month keys, sort ascending.
  const allKeys = new Set<string>([...availableByMonth.keys(), ...selectedByMonth.keys()]);
  const histogram: MonthStat[] = [...allKeys].sort().map((monthKey) => ({
    monthKey,
    available: availableByMonth.get(monthKey) ?? 0,
    selected: selectedByMonth.get(monthKey) ?? 0,
  }));

  return { project, kind, selection, photosByBucket, histogram };
}
