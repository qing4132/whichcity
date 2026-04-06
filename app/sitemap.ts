import type { MetadataRoute } from "next";
import { CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { LOCALES } from "@/lib/i18nRouting";

const BASE_URL = "https://whichcity.run";

function alternates(path: string) {
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[loc] = `${BASE_URL}/${loc}${path}`;
  }
  languages["x-default"] = `${BASE_URL}/en${path}`;
  return { languages };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const routes: MetadataRoute.Sitemap = [];

  // Static pages
  const staticPaths = ["", "/ranking", "/methodology"];
  for (const loc of LOCALES) {
    for (const path of staticPaths) {
      routes.push({
        url: `${BASE_URL}/${loc}${path}`,
        lastModified: now,
        changeFrequency: path === "" ? "weekly" : path === "/ranking" ? "weekly" : "monthly",
        priority: path === "" ? 1.0 : path === "/ranking" ? 0.9 : 0.6,
        alternates: alternates(path),
      });
    }
  }

  // City pages
  for (const slug of Object.values(CITY_SLUGS)) {
    const path = `/city/${slug}`;
    for (const loc of LOCALES) {
      routes.push({
        url: `${BASE_URL}/${loc}${path}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: alternates(path),
      });
    }
  }

  // Compare pages
  const seen = new Set<string>();
  for (const [a, b] of POPULAR_PAIRS) {
    const pair = [CITY_SLUGS[a], CITY_SLUGS[b]].sort().join("-vs-");
    if (seen.has(pair)) continue;
    seen.add(pair);
    const path = `/compare/${pair}`;
    for (const loc of LOCALES) {
      routes.push({
        url: `${BASE_URL}/${loc}${path}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: alternates(path),
      });
    }
  }

  return routes;
}
