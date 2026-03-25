/** URL-safe slug ↔ city ID mapping for all 100 cities */
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
  66: "caracas", 67: "johannesburg", 68: "cape-town", 69: "guadalajara", 70: "san-jose",
  71: "panama-city", 72: "havana", 73: "san-juan", 74: "montego-bay", 75: "abu-dhabi",
  76: "doha", 77: "manama", 78: "riyadh", 79: "muscat", 80: "beirut",
  81: "amman", 82: "tel-aviv", 83: "hyderabad", 84: "pune", 85: "kyiv",
  86: "bucharest", 87: "sofia", 88: "zagreb", 89: "belgrade", 90: "budapest",
  91: "bratislava", 92: "ljubljana", 93: "dublin", 94: "belfast", 95: "atlanta",
  96: "phoenix", 97: "portland", 98: "san-diego", 99: "las-vegas", 100: "tampa",
};

/** Reverse lookup: slug → city ID */
export const SLUG_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(CITY_SLUGS).map(([id, slug]) => [slug, Number(id)])
);

/** Get all slugs for static generation */
export function getAllCitySlugs(): string[] {
  return Object.values(CITY_SLUGS);
}

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
];
