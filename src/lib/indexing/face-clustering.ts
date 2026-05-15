import {
  listFacesByProject, setFaceCluster, clearPersonClusters, insertPersonCluster,
} from '$lib/db';

// Pass 1: face-to-centroid match threshold. Lower = more permissive joining.
const INITIAL_THRESHOLD = 0.30;

// Pass 2: cluster-centroid pairwise merge threshold. Higher than INITIAL_THRESHOLD
// because cluster centroids (averages over N faces) are more stable than
// individual face embeddings — stricter is safe and avoids false merges.
const MERGE_THRESHOLD = 0.36;

// Minimum face quality to seed a new cluster. Low-quality faces can still join
// existing clusters but won't create new ones.
const SEED_QUALITY_FLOOR = 0.1;

function decodeEmbedding(blob: Uint8Array): Float32Array {
  return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;  // both are L2-normalized → dot product is cosine
}

function normalize(v: Float32Array): void {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n);
  if (n > 0) for (let i = 0; i < v.length; i++) v[i] /= n;
}

interface InMemoryCluster {
  centroid: Float32Array;
  memberFaceIds: number[];
}

function weightedMergeCentroid(a: InMemoryCluster, b: InMemoryCluster): Float32Array {
  const na = a.memberFaceIds.length;
  const nb = b.memberFaceIds.length;
  const out = new Float32Array(a.centroid.length);
  for (let k = 0; k < out.length; k++) {
    out[k] = (a.centroid[k] * na + b.centroid[k] * nb) / (na + nb);
  }
  normalize(out);
  return out;
}

export async function clusterFaces(projectId: number): Promise<void> {
  const faces = await listFacesByProject(projectId);
  if (faces.length === 0) {
    await clearPersonClusters(projectId);
    return;
  }

  const decoded = faces.map((f) => ({
    face: f,
    vec: decodeEmbedding(new Uint8Array(f.embedding)),
  }));

  // ---- Diagnostic: embedding sanity ----
  for (let i = 0; i < Math.min(3, decoded.length); i++) {
    const v = decoded[i].vec;
    const firstFive = Array.from(v.slice(0, 5)).map((x) => x.toFixed(4)).join(', ');
    let norm = 0;
    for (let k = 0; k < v.length; k++) norm += v[k] * v[k];
    console.log(`[face-clustering] embedding ${i}: length=${v.length}, norm=${Math.sqrt(norm).toFixed(4)}, first 5 values: [${firstFive}]`);
  }

  // Sort by descending quality so high-quality faces seed clusters first.
  decoded.sort((a, b) => (b.face.quality ?? 0) - (a.face.quality ?? 0));

  // ---- Pass 1: greedy assignment ----
  const clusters: InMemoryCluster[] = [];
  for (const { face, vec } of decoded) {
    let joined: InMemoryCluster | null = null;
    for (const c of clusters) {
      if (cosine(vec, c.centroid) >= INITIAL_THRESHOLD) {
        joined = c;
        break;
      }
    }
    if (joined) {
      joined.memberFaceIds.push(face.id);
      const n = joined.memberFaceIds.length;
      const newCentroid = new Float32Array(joined.centroid.length);
      for (let i = 0; i < joined.centroid.length; i++) {
        newCentroid[i] = (joined.centroid[i] * (n - 1) + vec[i]) / n;
      }
      normalize(newCentroid);
      joined.centroid = newCentroid;
    } else {
      if ((face.quality ?? 0) < SEED_QUALITY_FLOOR) continue;
      clusters.push({
        centroid: new Float32Array(vec),
        memberFaceIds: [face.id],
      });
    }
  }

  // ---- Diagnostic: pass 1 results ----
  console.log(`[face-clustering] total faces: ${faces.length}`);
  console.log(`[face-clustering] clusters after pass 1: ${clusters.length}`);
  {
    const sizes = clusters.map((c) => c.memberFaceIds.length).sort((a, b) => b - a);
    const histogram = new Map<number, number>();
    for (const s of sizes) histogram.set(s, (histogram.get(s) ?? 0) + 1);
    const sortedHist = [...histogram.entries()].sort((a, b) => a[0] - b[0]);
    console.log(`[face-clustering] size histogram (size: count): ${sortedHist.map(([s, c]) => `${s}:${c}`).join(' ')}`);
    console.log(`[face-clustering] largest cluster: ${sizes[0] ?? 0} faces; total in clusters: ${sizes.reduce((a, b) => a + b, 0)}`);
  }
  // Compute top-5 most similar cluster pairs (full O(N²) once for diagnostics)
  {
    interface Pair { i: number; j: number; sim: number; }
    const pairs: Pair[] = [];
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        pairs.push({ i, j, sim: cosine(clusters[i].centroid, clusters[j].centroid) });
      }
    }
    pairs.sort((a, b) => b.sim - a.sim);
    const top = pairs.slice(0, 5);
    console.log(`[face-clustering] top-5 most similar cluster pairs:`);
    for (const p of top) {
      console.log(`  pair (sizes ${clusters[p.i].memberFaceIds.length}, ${clusters[p.j].memberFaceIds.length}): cosine = ${p.sim.toFixed(4)}`);
    }
    console.log(`[face-clustering] MERGE_THRESHOLD = ${MERGE_THRESHOLD} — pairs >= this will be merged`);
  }

  // ---- Pass 2: centroid merge ----
  // Repeatedly find the most similar pair of clusters; if their centroid
  // similarity is at least MERGE_THRESHOLD, merge them. Stop when the best
  // pair falls below the threshold.
  let merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    let bestI = -1, bestJ = -1, bestSim = MERGE_THRESHOLD;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = cosine(clusters[i].centroid, clusters[j].centroid);
        if (sim > bestSim) {
          bestSim = sim;
          bestI = i;
          bestJ = j;
        }
      }
    }
    if (bestI >= 0) {
      const newCentroid = weightedMergeCentroid(clusters[bestI], clusters[bestJ]);
      const newMembers = [...clusters[bestI].memberFaceIds, ...clusters[bestJ].memberFaceIds];
      clusters[bestI] = { centroid: newCentroid, memberFaceIds: newMembers };
      clusters.splice(bestJ, 1);
      merged = true;
    }
  }

  console.log(`[face-clustering] clusters after pass 2 (merge): ${clusters.length}`);

  // ---- Pass 3: persist ----
  await clearPersonClusters(projectId);
  for (const c of clusters) {
    const dbId = await insertPersonCluster(projectId);
    for (const fid of c.memberFaceIds) {
      await setFaceCluster(fid, dbId);
    }
  }
}
