/** URL-safe slug ↔ city ID mapping for all 148 cities */
export const CITY_SLUGS: Record<number, string> = {
  1: "new-york", 2: "london", 3: "tokyo", 4: "beijing", 5: "shanghai",
  6: "sydney", 7: "singapore", 8: "paris", 9: "toronto", 10: "hong-kong",
  11: "los-angeles", 12: "san-francisco", 13: "chicago", 14: "dubai", 15: "amsterdam",
  16: "zurich", 17: "geneva", 18: "munich", 19: "berlin", 20: "barcelona",
  21: "madrid", 22: "milan", 23: "rome", 24: "brussels", 25: "vienna",
  26: "prague", 27: "warsaw", 28: "lisbon", 29: "athens", 30: "istanbul",
  31: "mexico-city", 32: "sao-paulo", 33: "rio-de-janeiro", 34: "miami", 35: "washington",
  36: "boston", 37: "seattle", 38: "denver", 39: "austin", 40: "vancouver",
  41: "montreal", 42: "melbourne", 43: "brisbane", 44: "auckland", 45: "bangkok",
  46: "kuala-lumpur", 47: "ho-chi-minh-city", 48: "hanoi", 49: "bengaluru", 50: "mumbai",
  51: "new-delhi", 52: "nairobi", 53: "cairo", 54: "tehran", 55: "karachi",
  56: "islamabad", 57: "jakarta", 58: "manila", 59: "seoul", 60: "busan",
  61: "taipei", 62: "buenos-aires", 63: "santiago", 64: "bogota", 65: "lima",
  67: "johannesburg", 68: "cape-town", 69: "guadalajara", 70: "san-jose",
  71: "panama-city", 73: "san-juan", 75: "abu-dhabi",
  76: "doha", 77: "manama", 78: "riyadh", 79: "muscat", 80: "beirut",
  81: "amman", 82: "tel-aviv", 83: "hyderabad", 84: "pune", 85: "kyiv",
  86: "bucharest", 87: "sofia", 88: "zagreb", 89: "belgrade", 90: "budapest",
  91: "bratislava", 92: "ljubljana", 93: "dublin", 94: "belfast", 95: "atlanta",
  96: "phoenix", 97: "portland", 98: "san-diego", 99: "las-vegas", 100: "tampa",
  101: "guangzhou", 102: "shenzhen", 103: "chengdu", 104: "hangzhou", 105: "chongqing",
  106: "osaka", 107: "nagoya", 108: "incheon", 109: "phnom-penh", 110: "yangon",
  112: "chiang-mai", 114: "dhaka", 115: "colombo",
  116: "kathmandu", 117: "almaty", 118: "tashkent", 119: "baku", 120: "ulaanbaatar",
  121: "stockholm", 122: "copenhagen", 123: "helsinki", 124: "oslo", 125: "houston",
  126: "philadelphia", 127: "calgary", 128: "perth", 129: "medellin", 130: "tbilisi",
  131: "lagos", 132: "moscow", 133: "san-jose-us", 134: "irvine", 135: "ottawa",
  136: "luxembourg-city", 137: "tallinn", 138: "fukuoka", 139: "yokohama",
  140: "bali", 141: "da-nang", 142: "playa-del-carmen", 143: "porto", 144: "valencia",
  146: "split", 147: "phuket", 148: "montevideo", 149: "las-palmas",
  150: "penang", 152: "florianopolis",
  157: "cancun",
  158: "puerto-vallarta", 159: "kyoto",
  160: "casablanca", 161: "wellington",
};

/** Reverse lookup: slug → city ID */
export const SLUG_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(CITY_SLUGS).map(([id, slug]) => [slug, Number(id)])
);

/** Popular comparison pairs for static pre-generation (high search volume) */
export const POPULAR_PAIRS: [number, number][] = [
  // US vs US
  [1, 12], [1, 11], [1, 13], [12, 37], [12, 11], [1, 36], [1, 35],
  // US vs Europe
  [1, 2], [12, 2], [1, 8], [1, 19],
  // US vs Asia
  [1, 3], [12, 7], [1, 4], [1, 5],
  // Europe cross
  [2, 8], [2, 19], [18, 19], [20, 21], [22, 23], [2, 15], [2, 93],
  // Asia cross
  [3, 59], [3, 10], [7, 10], [4, 5], [59, 61],
  // Oceania
  [6, 42], [6, 44],
  // Canada
  [9, 40], [9, 41],
  // Tech hubs
  [12, 49], [12, 19], [37, 9], [39, 38],
  // Finance hubs
  [1, 2], [1, 10], [7, 14],
  // LatAm
  [32, 31], [32, 62], [63, 65],
  // Middle East
  [14, 75], [14, 78],
  // DACH
  [16, 17], [16, 18], [25, 18],
  // Chinese cities
  [4, 101], [4, 102], [5, 102], [101, 102], [103, 104], [105, 103],
  // East Asian & SE Asian
  [3, 106], [106, 59], [59, 108], [45, 112],
  [50, 114], [49, 115], [117, 118], [119, 120],
  // Nordic
  [121, 122], [122, 123], [123, 124], [121, 124],
  // New US + Canada
  [125, 39], [126, 1], [133, 12], [134, 11], [127, 9], [135, 9],
  // New Japan
  [3, 138], [3, 139], [106, 138],
  // New Europe
  [132, 19], [136, 24], [137, 123],
  // New others
  [128, 6], [129, 64], [130, 119], [131, 52],
];

/** Top cities by search volume — all pairwise combos auto-generated for sitemap */
const TOP_CITY_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  19, 20, 21, 28, 29, 30, 31, 32, 37, 45, 49, 50, 59, 61, 82,
];

/** Extended compare pairs for sitemap: POPULAR_PAIRS + top-city combos, deduplicated */
export const SITEMAP_PAIRS: [number, number][] = (() => {
  const seen = new Set<string>();
  const result: [number, number][] = [];
  const add = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push([a, b]);
  };
  for (const [a, b] of POPULAR_PAIRS) add(a, b);
  for (let i = 0; i < TOP_CITY_IDS.length; i++) {
    for (let j = i + 1; j < TOP_CITY_IDS.length; j++) {
      add(TOP_CITY_IDS[i], TOP_CITY_IDS[j]);
    }
  }
  return result;
})();
