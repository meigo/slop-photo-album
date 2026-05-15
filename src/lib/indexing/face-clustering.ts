import {
  listFacesByProject, setFaceCluster, clearPersonClusters, insertPersonCluster,
} from '$lib/db';

const INITIAL_THRESHOLD = 0.30;   // pass 1 face-to-centroid join
const MERGE_THRESHOLD = 0.25;     // pass 2 cluster centroid pairwise merge
const LINKAGE_THRESHOLD = 0.55;   // pass 3 single-linkage (max face-pair) merge
const SEED_QUALITY_FLOOR = 0.1;

function decodeEmbedding(b64: string): Float32Array {
  if (!b64 || b64.length === 0) return new Float32Array(0);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
}

function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
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
  memberVecs: Float32Array[];
}

function mergeClusters(a: InMemoryCluster, b: InMemoryCluster): InMemoryCluster {
  const na = a.memberFaceIds.length;
  const nb = b.memberFaceIds.length;
  const centroid = new Float32Array(a.centroid.length);
  for (let k = 0; k < centroid.length; k++) {
    centroid[k] = (a.centroid[k] * na + b.centroid[k] * nb) / (na + nb);
  }
  normalize(centroid);
  return {
    centroid,
    memberFaceIds: [...a.memberFaceIds, ...b.memberFaceIds],
    memberVecs: [...a.memberVecs, ...b.memberVecs],
  };
}

function maxFacePairCosine(a: InMemoryCluster, b: InMemoryCluster): number {
  let best = -1;
  for (const va of a.memberVecs) {
    for (const vb of b.memberVecs) {
      const s = cosine(va, vb);
      if (s > best) best = s;
    }
  }
  return best;
}

export async function clusterFaces(projectId: number): Promise<void> {
  const faces = await listFacesByProject(projectId);
  if (faces.length === 0) {
    await clearPersonClusters(projectId);
    return;
  }

  const decoded = faces.map((f) => ({ face: f, vec: decodeEmbedding(f.embedding) }));

  // ---- Diagnostic: embedding sanity ----
  for (let i = 0; i < Math.min(3, decoded.length); i++) {
    const v = decoded[i].vec;
    const firstFive = Array.from(v.slice(0, 5)).map((x) => x.toFixed(4)).join(', ');
    let norm = 0;
    for (let k = 0; k < v.length; k++) norm += v[k] * v[k];
    console.log(`[face-clustering] embedding ${i}: length=${v.length}, norm=${Math.sqrt(norm).toFixed(4)}, first 5 values: [${firstFive}]`);
  }

  decoded.sort((a, b) => (b.face.quality ?? 0) - (a.face.quality ?? 0));

  // ---- Pass 1: greedy assignment ----
  const clusters: InMemoryCluster[] = [];
  for (const { face, vec } of decoded) {
    if (vec.length === 0) continue;  // skip empty/broken embeddings
    let joined: InMemoryCluster | null = null;
    for (const c of clusters) {
      if (cosine(vec, c.centroid) >= INITIAL_THRESHOLD) { joined = c; break; }
    }
    if (joined) {
      joined.memberFaceIds.push(face.id);
      joined.memberVecs.push(vec);
      const n = joined.memberFaceIds.length;
      const nc = new Float32Array(joined.centroid.length);
      for (let i = 0; i < nc.length; i++) nc[i] = (joined.centroid[i] * (n - 1) + vec[i]) / n;
      normalize(nc);
      joined.centroid = nc;
    } else {
      if ((face.quality ?? 0) < SEED_QUALITY_FLOOR) continue;
      clusters.push({
        centroid: new Float32Array(vec),
        memberFaceIds: [face.id],
        memberVecs: [vec],
      });
    }
  }

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
  {
    interface Pair { i: number; j: number; sim: number; }
    const pairs: Pair[] = [];
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        pairs.push({ i, j, sim: cosine(clusters[i].centroid, clusters[j].centroid) });
      }
    }
    pairs.sort((a, b) => b.sim - a.sim);
    console.log(`[face-clustering] top-5 most similar cluster pairs (centroid):`);
    for (const p of pairs.slice(0, 5)) {
      console.log(`  pair (sizes ${clusters[p.i].memberFaceIds.length}, ${clusters[p.j].memberFaceIds.length}): cosine = ${p.sim.toFixed(4)}`);
    }
    console.log(`[face-clustering] MERGE_THRESHOLD = ${MERGE_THRESHOLD}, LINKAGE_THRESHOLD = ${LINKAGE_THRESHOLD}`);
  }

  // ---- Pass 2: centroid merge ----
  let merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    let bestI = -1, bestJ = -1, bestSim = MERGE_THRESHOLD;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = cosine(clusters[i].centroid, clusters[j].centroid);
        if (sim > bestSim) { bestSim = sim; bestI = i; bestJ = j; }
      }
    }
    if (bestI >= 0) {
      clusters[bestI] = mergeClusters(clusters[bestI], clusters[bestJ]);
      clusters.splice(bestJ, 1);
      merged = true;
    }
  }
  console.log(`[face-clustering] clusters after pass 2 (centroid merge): ${clusters.length}`);

  // ---- Pass 3: single-linkage merge ----
  // For each pair of clusters, find MAX face-pair cosine. If any pair has
  // a face-to-face similarity above LINKAGE_THRESHOLD, merge them. Catches
  // same-person clusters whose centroids drifted apart due to mode diversity.
  merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    let bestI = -1, bestJ = -1, bestSim = LINKAGE_THRESHOLD;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = maxFacePairCosine(clusters[i], clusters[j]);
        if (sim > bestSim) { bestSim = sim; bestI = i; bestJ = j; }
      }
    }
    if (bestI >= 0) {
      clusters[bestI] = mergeClusters(clusters[bestI], clusters[bestJ]);
      clusters.splice(bestJ, 1);
      merged = true;
    }
  }
  console.log(`[face-clustering] clusters after pass 3 (linkage merge): ${clusters.length}`);

  // ---- Pass 4: persist ----
  await clearPersonClusters(projectId);
  for (const c of clusters) {
    const dbId = await insertPersonCluster(projectId);
    for (const fid of c.memberFaceIds) {
      await setFaceCluster(fid, dbId);
    }
  }
}
