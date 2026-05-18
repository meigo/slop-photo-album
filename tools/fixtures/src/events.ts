import type { Camera } from "./manifest.ts";

export type EventTemplate = {
  key: string;
  monthWindow: [number, number];
  hourWindow: [number, number];
  weight: number;
  peopleRange: [number, number];
  promptVariants: readonly string[];
  // Scene-only descriptions for the puppet/stop-motion style set. The
  // generator prepends PUPPET_FAMILY_PREAMBLE before submitting so character
  // descriptors stay consistent across photos. Adapted from slop-opera-factory's
  // 03_stop_motion style — same anchors ("NOT a diorama", "camera INSIDE the
  // scene", "visible fingerprints") that keep FLUX from rendering puppets on
  // a shelf.
  puppetSceneVariants: readonly string[];
  locations: readonly { label: string; gps: [number, number] }[];
};

// Prepended to every puppet-style prompt. Defines the four family members in
// detail (same characters across all photos) plus the aesthetic anchors that
// keep FLUX inside the stop-motion lane.
export const PUPPET_FAMILY_PREAMBLE = `Stop-motion clay puppet family photographed at character scale, NOT a miniature diorama, NOT a doll-house, NOT a model viewed from outside — the camera is INSIDE the scene at puppet-eye level. Soft warm tungsten light, shallow depth of field. Visible fingerprints on every clay surface, slight handmade wonkiness, replacement-eye animation with eyes painted directly onto clay faces. The four family puppets, recurring across every photo:
- Father puppet: mid-thirties, dark stubble made of felt, dark hair sculpted from clay, plaid flannel shirt sewn from fabric scraps, slightly thicker build.
- Mother puppet: mid-thirties, curly red yarn hair, freckles painted on clay cheeks, knitted wool cardigan, slight smile.
- Older child puppet: about age 8, curly red yarn hair matching the mother, striped t-shirt sewn from cotton, missing front tooth painted on.
- Younger child puppet: about age 4, blonde wool hair, blue corduroy overalls with felt patches on the knees, round clay cheeks.
Hand-built sets with wallpapered walls, wooden floorboards, ordinary household objects rendered in clay and cardboard.`;

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
      "candid smartphone photo of a small family on a winter walk, mother father and a child in winter jackets, snowy park in Estonia, grey overcast sky, ordinary family album snapshot, realistic phone image, crisp daylight",
      "casual phone photo of two parents with a young child walking through a snowy forest path, late morning light, imperfect framing, realistic phone camera, sharp focus",
    ],
    puppetSceneVariants: [
      "Scene: the four puppets walking through a hand-built snowy forest, cotton-batting snow on the ground, tiny felt scarves and knitted hats, breath puffs made from cotton wool, grey overcast paper sky.",
      "Scene: father and mother puppets holding the children's hands on a path through cardboard birch trees, snow made of crumpled paper, soft winter daylight diffused through a paper backdrop.",
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
    puppetSceneVariants: [
      "Scene: the puppets crouching in a hand-built spring garden, paper daffodils with painted yellow petals, tiny clay tulips, mother puppet pointing at a bee made of yellow felt.",
      "Scene: family puppets walking past a fence on a path of brown felt, paper budding branches overhead, light gauze sunlight from one side.",
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
    puppetSceneVariants: [
      "Scene: the puppet family standing in a pile of paper autumn leaves cut from orange and yellow construction paper, knitted woolen hats on every head, low golden side-lighting.",
      "Scene: younger child puppet tossing handfuls of paper leaves into the air, the others laughing in the background, cardboard tree trunks painted with bark texture.",
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
    puppetSceneVariants: [
      "Scene: the puppet family on a hand-built river bank, blue cellophane water with painted ripples, green felt grass, the children puppets wearing tiny shorts and t-shirts.",
      "Scene: father and mother puppets walking down a forest path of brown felt with cardboard pine trees on either side, dappled summer light filtered through paper leaves.",
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
    puppetSceneVariants: [
      "Scene: the four puppets on a hand-built beach with sandpaper sand and a blue cloth sea, younger child puppet building a clay sandcastle, harsh top-down warm lighting.",
      "Scene: mother puppet sitting on a striped felt towel, children puppets running toward a cellophane wave, father puppet in the background under a paper sun.",
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
    puppetSceneVariants: [
      "Scene: the older child puppet stiffly posed holding a tiny bouquet of paper gerberas, brand-new felt backpack, parents puppets standing on either side, hand-built school doorway in the background.",
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
    puppetSceneVariants: [
      "Scene: older child puppet at a hand-built kitchen table, tiny clay bowl of cereal, mother puppet in the background holding a clay coffee mug, soft morning light.",
      "Scene: younger child puppet in pajamas zipping up a felt backpack in a wallpapered hallway, mother puppet kneeling to help, warm hallway lamp light.",
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
      "candid smartphone family photo, child's birthday party at home, parents and child around a small cake, wrapping paper, ordinary family snapshot, slightly cluttered background, realistic phone camera, sharp focus",
      "phone photo of a small child blowing out birthday candles, parents visible behind, warm kitchen light, casual home setting, sharp focus",
    ],
    puppetSceneVariants: [
      "Scene: the family puppets around a clay birthday cake with tiny matchstick candles, paper streamers above, wrapping paper made of scrap fabric. Younger child puppet leaning in to blow out the candles.",
      "Scene: older child puppet blowing out birthday candles on a clay cake, the others puppets clapping behind, warm tungsten table-lamp light.",
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
    puppetSceneVariants: [
      "Scene: younger child puppet on a hand-built wooden swing with twine ropes, father puppet pushing from behind, green felt grass underneath.",
      "Scene: both child puppets at the top of a cardboard slide, mother puppet visible at the bottom holding her arms out, paper trees in the background.",
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
      "phone photo of a family cat on a couch, indoor light, realistic phone camera, sharp focus",
      "phone photo of a small dog in a kitchen, candid moment, natural daylight, realistic phone camera",
      "phone photo of a child hugging a family pet, warm indoor light, casual framing, sharp focus",
      "blurry phone photo of a cat mid-jump, motion blur from the pet moving, low indoor light",
    ],
    puppetSceneVariants: [
      "Scene: a stop-motion felt cat with button eyes curled up on a tiny knitted couch blanket, no puppets present, warm side-lamp light.",
      "Scene: a clay-and-wool dog puppet standing in a hand-built kitchen, looking up at the camera, soft natural light from a paper window.",
      "Scene: younger child puppet hugging the felt cat on a knitted couch, mother puppet visible in the background out of focus.",
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
      "candid family dinner phone photo, two parents and a child around a table, warm kitchen light, food on plates, casual framing, realistic phone camera, sharp focus",
      "phone snapshot of a small family eating pasta at home, parent helping a young child, ordinary moment, indoor light, realistic phone camera",
    ],
    puppetSceneVariants: [
      "Scene: the four puppets around a hand-built wooden dinner table, clay food on tiny ceramic plates, warm tungsten ceiling lamp casting a circle of light, wallpapered walls in the background.",
      "Scene: mother puppet leaning over to help younger child puppet with a clay bowl of pasta, father and older child puppets eating across the table, slightly cluttered dinner scene.",
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
    puppetSceneVariants: [
      "Scene: the hand-built puppet kitchen empty of people but covered in tiny clay dishes, paper cereal box knocked over, scattered painted-cereal flakes on a wooden counter, morning light.",
      "Scene: younger child puppet standing on a stool at a kitchen counter, clay bowl tipped over, cereal flakes made of yellow felt scattered everywhere, no other puppets in frame.",
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
    puppetSceneVariants: [
      "Scene: the puppet family gathered near a hand-built Christmas tree made of felt and cardboard, tiny paper ornaments and a string of LED grain-of-wheat lights, wrapped clay presents underneath, warm orange tungsten light from a paper-shaded lamp.",
      "Scene: the four puppets at a Christmas dinner table, clay roast on a tiny platter, paper crackers, candle flames painted onto matchsticks, warm low light, slight cluttered handmade festivity.",
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

// "distorted face" / "extra fingers" deliberately dropped — puppet faces are
// intentionally imperfect and hands made of clay are good. "Real photo of
// humans" + "live actors" added to prevent FLUX collapsing back to a realistic
// family.
export const PUPPET_NEGATIVE_PROMPT =
  "real photo of humans, live actors, real people, realistic skin, studio portrait, fashion shoot, photoreal, CGI render, 3D render, smooth animation, motion blur, watermark, text";

export const CAMERA_PROFILES: readonly { camera: Camera; weight: number }[] = [
  { camera: { make: "Apple", model: "iPhone 13", lensModel: "iPhone 13 back dual wide camera" }, weight: 5 },
  { camera: { make: "Apple", model: "iPhone 14 Pro", lensModel: "iPhone 14 Pro back triple camera" }, weight: 3 },
  { camera: { make: "samsung", model: "SM-S911B" }, weight: 3 },
  { camera: { make: "Google", model: "Pixel 7" }, weight: 2 },
];
