import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { AlbumManifest, type PhotoEntry, type PhotoStyle } from "./manifest.ts";
import { EVENTS, MONTH_WEIGHTS, NEGATIVE_PROMPT, CAMERA_PROFILES } from "./events.ts";
import { makeRng, pick, pickWeighted, randInt, randSeed } from "./rng.ts";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(n: number, width = 2): string {
  return n.toString().padStart(width, "0");
}

function formatExifDate(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
  return `${year}:${pad(month)}:${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function formatFilename(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
  return `IMG_${year}${pad(month)}${pad(day)}_${pad(hour)}${pad(minute)}${pad(second)}.jpg`;
}

const { values } = parseArgs({
  options: {
    year: { type: "string", default: String(new Date().getFullYear()) },
    count: { type: "string", default: "80" },
    seed: { type: "string", default: "1" },
    style: { type: "string", default: "realistic" },
    name: { type: "string" },
    out: { type: "string" },
  },
});

const year = Number(values.year);
const count = Number(values.count);
const seed = Number(values.seed);
const style = values.style as PhotoStyle;
const name = values.name ?? `family-${year}`;
const out = resolve(values.out ?? `manifests/${name}.json`);

const rng = makeRng(seed);

// Stratified per-month allocation: split `count` across 12 months proportional
// to MONTH_WEIGHTS so every month gets photos (assuming count ≥ 12). Quota
// remainders go to months with the largest fractional part to keep totals exact.
function allocateMonths(total: number): number[] {
  const totalWeight = MONTH_WEIGHTS.reduce((s, w) => s + w, 0);
  const quotas = MONTH_WEIGHTS.map((w) => (w / totalWeight) * total);
  const floors = quotas.map(Math.floor);
  let remaining = total - floors.reduce((s, n) => s + n, 0);
  const order = quotas
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);
  const allocation = [...floors];
  for (const monthIdx of order) {
    if (remaining <= 0) break;
    allocation[monthIdx] += 1;
    remaining -= 1;
  }
  return allocation;
}

const monthAllocation = allocateMonths(count);
const photos: PhotoEntry[] = [];
let serial = 0;

for (let month = 1; month <= 12; month++) {
  const target = monthAllocation[month - 1];
  const candidates = EVENTS.filter((e) => month >= e.monthWindow[0] && month <= e.monthWindow[1]);
  if (candidates.length === 0) {
    throw new Error(`No events cover month ${month}; add one to events.ts`);
  }

  for (let n = 0; n < target; n++) {
    const event = pickWeighted(rng, candidates.map((e) => ({ value: e, weight: e.weight })));
    const camera = pickWeighted(rng, CAMERA_PROFILES.map((c) => ({ value: c.camera, weight: c.weight })));
    const location = pick(rng, event.locations);

    const day = randInt(rng, 1, daysInMonth(year, month));
    const hour = randInt(rng, event.hourWindow[0], event.hourWindow[1]);
    const minute = randInt(rng, 0, 59);
    const second = randInt(rng, 0, 59);

    photos.push({
      id: `${year}_${event.key}_${pad(serial++, 4)}`,
      filename: formatFilename(year, month, day, hour, minute, second),
      date: formatExifDate(year, month, day, hour, minute, second),
      timezone: "+03:00",
      gps: location.gps,
      locationLabel: location.label,
      event: event.key,
      peopleCount: randInt(rng, event.peopleRange[0], event.peopleRange[1]),
      camera,
      style,
      quality: ["good"],
      prompt: pick(rng, event.promptVariants),
      negativePrompt: NEGATIVE_PROMPT,
      width: 1216,
      height: 832,
      seed: randSeed(rng),
    });
  }
}

photos.sort((a, b) => a.date.localeCompare(b.date));

const manifest = AlbumManifest.parse({
  schemaVersion: 1,
  name,
  year,
  generatedAt: new Date().toISOString(),
  generatorSeed: seed,
  defaults: {
    timezone: "+03:00",
    camera: CAMERA_PROFILES[0].camera,
  },
  photos,
});

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(manifest, null, 2) + "\n", "utf8");

const perMonth = monthAllocation.map((n, i) => `${pad(i + 1)}=${n}`).join("  ");
console.log(`Wrote ${photos.length} entries → ${out}`);
console.log(`Per-month allocation: ${perMonth}`);
