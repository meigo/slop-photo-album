import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import {
  upsertPhoto, getProject, listIndexedAtByPath,
  upsertCvScore, listCvComputedAtByPhotoId, listPhotos,
  clearCvScores, clearFacesForPhoto, insertFace,
  deletePhotoByPath,
  db,
} from '$lib/db';
import { readExifViaSidecar, makeThumbViaSidecar } from '$lib/sidecar/client';
import { blurViaPy, phashViaPy, facesViaPy, exposureViaPy } from '$lib/sidecar/py-client';
import { indexProgress } from './progress';
import { detectDuplicates } from './dedup';

interface ScannedFile { path: string; size: number; modified: number; }

export async function indexProject(
  projectId: number,
  opts?: { forceCv?: boolean }
): Promise<void> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  indexProgress.set({ phase: 'walking', scanned: 0, total: 0, current: project.source_dir, errors: [], projectId });
  const files = await invoke<ScannedFile[]>('walk_image_dir', { dir: project.source_dir });
  const total = files.length;

  const lastIndexedByPath = await listIndexedAtByPath(projectId);

  const appDir = await appDataDir();
  const thumbDir = await join(appDir, 'projects', String(projectId), 'thumbs');

  indexProgress.update((p) => ({ ...p, phase: 'indexing', total }));

  // ---- INDEXING PASS (unchanged from Phase 2a) ----
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    indexProgress.update((p) => ({ ...p, scanned: i, current: f.path }));
    const prev = lastIndexedByPath.get(f.path);
    if (prev !== undefined && prev >= f.modified * 1000) continue;
    try {
      const sha256 = await invoke<string>('hash_file', { path: f.path });
      const exif = await readExifViaSidecar(f.path);
      const thumbPath = await join(thumbDir, `${sha256}.jpg`);
      await makeThumbViaSidecar(f.path, thumbPath, 256);
      await upsertPhoto({
        project_id: projectId, path: f.path, sha256,
        taken_at: exif.taken_at ? Date.parse(exif.taken_at) : (f.modified * 1000),
        width: exif.width, height: exif.height, orientation: exif.orientation,
        exif_json: exif.exif_json, thumb_path: thumbPath, indexed_at: Date.now(),
      });
    } catch (err) {
      indexProgress.update((p) => ({ ...p, errors: [...p.errors, `${f.path}: ${err}`] }));
    }
  }

  // ---- ORPHAN CLEANUP ----
  // Delete photo rows whose path no longer exists on disk. Renamed files
  // were handled by the ON CONFLICT (project_id, sha256) UPDATE during the
  // indexing loop — their rows' paths are now the new paths and thus appear
  // in walkedPaths. Truly-removed files retain their old path in the DB
  // and will be deleted here.
  {
    const walkedPaths = new Set(files.map((f) => f.path));
    for (const oldPath of lastIndexedByPath.keys()) {
      if (!walkedPaths.has(oldPath)) {
        await deletePhotoByPath(projectId, oldPath);
      }
    }
  }

  // ---- CV PASS (Phase 2a + 2b) ----
  indexProgress.update((p) => ({ ...p, phase: 'indexing', current: 'running CV pass…' }));
  if (opts?.forceCv) {
    await clearCvScores(projectId);
  }
  const photos = await listPhotos(projectId);
  const cvComputed = await listCvComputedAtByPhotoId(projectId);

  for (let i = 0; i < photos.length; i++) {
    const ph = photos[i];
    indexProgress.update((p) => ({ ...p, scanned: i, total: photos.length, current: `cv: ${ph.path}` }));

    const lastCv = cvComputed.get(ph.id);
    if (lastCv !== undefined && lastCv >= ph.indexed_at) continue;

    try {
      // Faces first so we can pass its bboxes to blur — whole-image
      // Laplacian variance misranks shallow-DOF portraits as blurry, so
      // we measure sharpness on the largest face region when faces are
      // present.
      const [facesResult, phash, exposure] = await Promise.all([
        facesViaPy(ph.path),
        phashViaPy(ph.path),
        exposureViaPy(ph.path),
      ]);
      const bboxes = facesResult.faces.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h, quality: f.quality }));
      const blur = await blurViaPy(ph.path, bboxes);

      await clearFacesForPhoto(ph.id);
      for (const fb of facesResult.faces) {
        await insertFace({
          photo_id: ph.id,
          bbox_x: fb.x, bbox_y: fb.y, bbox_w: fb.w, bbox_h: fb.h,
          quality: fb.quality,
          computed_at: Date.now(),
        });
      }

      await upsertCvScore({
        photo_id: ph.id,
        blur,
        faces_count: facesResult.count,
        faces_json: JSON.stringify(facesResult.faces.map(f => ({ x: f.x, y: f.y, w: f.w, h: f.h }))),
        phash,
        computed_at: Date.now(),
      });

      // exposure goes on cv_score (added by migration 003)
      const d = await db();
      await d.execute('UPDATE cv_score SET exposure = ? WHERE photo_id = ?', [exposure, ph.id]);
    } catch (err) {
      indexProgress.update((p) => ({ ...p, errors: [...p.errors, `cv ${ph.path}: ${err}`] }));
    }
  }

  // ---- DEDUP PASS ----
  indexProgress.update((p) => ({ ...p, current: 'detecting duplicates…' }));
  await detectDuplicates(projectId);

  indexProgress.update((p) => ({ ...p, phase: 'done', scanned: total }));
}
