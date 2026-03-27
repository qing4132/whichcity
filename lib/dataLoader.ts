import { readFileSync } from "fs";
import { join } from "path";
import type { City } from "./types";

// Re-export shared utilities (avoids duplication with clientUtils)
export { getCityClimate, getCityEnName, getCountryEnName, getAqiLabel, getClimateLabel, computeLifePressure } from "./clientUtils";

let _cities: City[] | null = null;

/** Load cities data from JSON file (server-side only, cached per process) */
export function loadCities(): City[] {
  if (_cities) return _cities;
  const filePath = join(process.cwd(), "public", "data", "cities.json");
  const raw = readFileSync(filePath, "utf-8");
  _cities = JSON.parse(raw).cities as City[];
  return _cities;
}

export function getCityById(id: number): City | undefined {
  return loadCities().find((c) => c.id === id);
}
