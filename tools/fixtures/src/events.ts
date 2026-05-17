import type { Camera } from "./manifest.ts";

export type EventTemplate = {
  key: string;
  monthWindow: [number, number];
  hourWindow: [number, number];
  weight: number;
  peopleRange: [number, number];
  promptVariants: readonly string[];
  locations: readonly { label: string; gps: [number, number] }[];
};

const ESTONIA_LOCATIONS = [
  { label: "Tallinn, Estonia", gps: [59.437, 24.7536] as [number, number] },
  { label: "Tartu, Estonia", gps: [58.3776, 26.729] as [number, number] },
  { label: "Pärnu, Estonia", gps: [58.3859, 24.4971] as [number, number] },
  { label: "Otepää, Estonia", gps: [58.0588, 26.4969] as [number, number] },
];

// Family shape: two parents (mother + father) + one or two children.
// peopleRange caps at 4 — never grandparents/cousins, those would shift the
// face-clustering test signal.
//
// Prompts deliberately stay loose on count ("small family", "young parents
// with a child") because FLUX over-specifies badly when given exact integers.
export const EVENTS: readonly EventTemplate[] = [
  {
    key: "winter_walk",
    monthWindow: [1, 2],
    hourWindow: [11, 15],
    weight: 6,
    peopleRange: [2, 4],
    promptVariants: [
      "candid smartphone photo of a small family on a winter walk, mother father and a child in winter jackets, snowy park in Estonia, grey overcast sky, ordinary family album snapshot, realistic phone image, slight motion blur",
      "casual phone photo of two parents with a young child walking through a snowy forest path, late morning light, imperfect framing, realistic phone camera",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "spring_outdoor",
    monthWindow: [3, 5],
    hourWindow: [10, 18],
    weight: 6,
    peopleRange: [2, 4],
    promptVariants: [
      "candid phone photo of a small family in a park, early spring, bare trees beginning to bud, light jackets, mother and father with their child, casual framing, realistic phone camera",
      "phone snapshot of a young couple with a small child looking at daffodils in a garden, soft daylight, slightly imperfect composition, realistic phone photo",
      "casual phone photo of a small family on a walk along a path with new green leaves, light jackets, ordinary family album snapshot",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "autumn_walk",
    monthWindow: [9, 11],
    hourWindow: [10, 17],
    weight: 6,
    peopleRange: [2, 4],
    promptVariants: [
      "candid phone photo of a small family among autumn leaves, mother and father with a young child, knitted hats, yellow and red foliage, low afternoon sun, realistic phone camera, slight lens flare",
      "phone snapshot of two parents and their child kicking through fallen leaves in a park, overcast autumn light, casual framing, realistic phone image",
      "casual family phone photo, autumn forest path, parents with a small child, warm jackets, ordinary family album snapshot",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "summer_trip",
    monthWindow: [6, 8],
    hourWindow: [10, 19],
    weight: 9,
    peopleRange: [2, 4],
    promptVariants: [
      "candid smartphone photo of a small family on a summer trip in Estonia, near a river, mother father and a child, casual framing, natural light, realistic phone photo",
      "phone snapshot of a young couple with a child playing outside on a summer day, slightly imperfect composition, realistic phone camera",
      "casual phone photo of a family of three or four on a summer hike, t-shirts, warm afternoon light, ordinary family album snapshot",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "beach_day",
    monthWindow: [6, 8],
    hourWindow: [11, 17],
    weight: 5,
    peopleRange: [2, 4],
    promptVariants: [
      "candid family beach photo on the Baltic coast, mother and father with a child playing in the sand, bright sunlight, slightly overexposed, realistic phone camera",
      "phone snapshot of a small family at a sandy Baltic beach, parents and one or two children, harsh midday sun, casual framing",
    ],
    locations: [{ label: "Pärnu beach, Estonia", gps: [58.3796, 24.5043] }],
  },
  {
    key: "first_day_of_school",
    monthWindow: [9, 9],
    hourWindow: [7, 9],
    weight: 3,
    peopleRange: [1, 3],
    promptVariants: [
      "phone photo of a child holding flowers on their first day of school, parents standing beside them on a doorstep in Estonia, morning light, slightly stiff posed snapshot, realistic phone camera",
      "casual phone photo of a small child with a brand-new backpack outside a school building, early autumn morning, ordinary family snapshot",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "school_morning",
    monthWindow: [1, 5],
    hourWindow: [7, 9],
    weight: 4,
    peopleRange: [1, 3],
    promptVariants: [
      "phone photo of a child with a backpack ready for school, hallway light, hurried framing, realistic phone camera",
      "candid phone photo of a child eating breakfast before school, kitchen morning light, parent's hand visible holding a mug, realistic phone image",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "birthday_party",
    monthWindow: [1, 12],
    hourWindow: [14, 19],
    weight: 3,
    peopleRange: [2, 4],
    promptVariants: [
      "candid smartphone family photo, child's birthday party at home, parents and child around a small cake, wrapping paper, ordinary family snapshot, slightly cluttered background, realistic phone camera, imperfect framing",
      "phone photo of a small child blowing out birthday candles, parents in soft focus behind, warm kitchen light, casual home setting",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "playground",
    monthWindow: [4, 10],
    hourWindow: [11, 18],
    weight: 6,
    peopleRange: [1, 3],
    promptVariants: [
      "candid phone photo of a child on a playground swing, parent standing beside, casual framing, natural daylight, realistic phone camera",
      "phone snapshot of two small children on a slide, mother visible in background, ordinary playground in Estonia, imperfect framing",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "pet_photo",
    monthWindow: [1, 12],
    hourWindow: [8, 22],
    weight: 4,
    peopleRange: [0, 2],
    promptVariants: [
      "phone photo of a family cat on a couch, indoor light, slightly blurry, realistic phone camera",
      "phone photo of a small dog in a kitchen, soft focus, candid moment",
      "phone photo of a child hugging a family pet, warm indoor light, casual framing",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "family_dinner",
    monthWindow: [1, 12],
    hourWindow: [18, 21],
    weight: 4,
    peopleRange: [2, 4],
    promptVariants: [
      "candid family dinner phone photo, two parents and a child around a table, warm kitchen light, food on plates, casual framing, realistic phone camera",
      "phone snapshot of a small family eating pasta at home, parent helping a young child, ordinary moment, soft indoor light",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "messy_kitchen",
    monthWindow: [1, 12],
    hourWindow: [8, 21],
    weight: 2,
    peopleRange: [0, 2],
    promptVariants: [
      "phone photo of a slightly messy kitchen after a family meal, dishes in sink, ordinary family moment, realistic phone camera",
      "phone photo of a child making a mess with breakfast cereal, kitchen counter, candid morning light, realistic phone image",
    ],
    locations: ESTONIA_LOCATIONS,
  },
  {
    key: "christmas_evening",
    monthWindow: [12, 12],
    hourWindow: [17, 22],
    weight: 5,
    peopleRange: [2, 4],
    promptVariants: [
      "casual indoor family photo, Christmas evening, two parents and a child near a Christmas tree, warm room, tree lights in background, realistic smartphone photo, imperfect composition, not professional",
      "phone photo of a small family around a Christmas table in Estonia, warm tungsten light, ordinary family moment, slightly cluttered home setting",
    ],
    locations: ESTONIA_LOCATIONS,
  },
];

// Per-month allocation weights — roughly mirrors how a real Estonian family
// album actually clusters: heavier in summer (vacation, beach) and December
// (Christmas), thinner in February and November. generate-manifest.ts
// distributes the requested --count across months in these proportions so
// every month gets at least some photos.
export const MONTH_WEIGHTS: readonly number[] = [
  4,  // Jan
  3,  // Feb
  5,  // Mar
  6,  // Apr
  7,  // May
  10, // Jun
  12, // Jul
  10, // Aug
  7,  // Sep
  6,  // Oct
  4,  // Nov
  10, // Dec
];

export const NEGATIVE_PROMPT =
  "studio portrait, fashion shoot, cinematic lighting, perfect skin, airbrushed, stock photo, advertisement, surreal, extra fingers, distorted face, watermark, text";

export const CAMERA_PROFILES: readonly { camera: Camera; weight: number }[] = [
  { camera: { make: "Apple", model: "iPhone 13", lensModel: "iPhone 13 back dual wide camera" }, weight: 5 },
  { camera: { make: "Apple", model: "iPhone 14 Pro", lensModel: "iPhone 14 Pro back triple camera" }, weight: 3 },
  { camera: { make: "samsung", model: "SM-S911B" }, weight: 3 },
  { camera: { make: "Google", model: "Pixel 7" }, weight: 2 },
];
