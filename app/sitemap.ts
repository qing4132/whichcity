import type { MetadataRoute } from "next";
import { CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";

const BASE_URL = "https://citycompare.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Home
  const routes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
  ];

  // City pages
  for (const slug of Object.values(CITY_SLUGS)) {
    routes.push({
      url: `${BASE_URL}/city/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // Compare pages
  const seen = new Set<string>();
  for (const [a, b] of POPULAR_PAIRS) {
    const pair = [CITY_SLUGS[a], CITY_SLUGS[b]].sort().join("-vs-");
    if (seen.has(pair)) continue;
    seen.add(pair);
    routes.push({
      url: `${BASE_URL}/compare/${pair}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return routes;
}
