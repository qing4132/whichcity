import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { City } from "@/lib/types";
import { SLUG_TO_ID, CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { loadCities, getCityById, getCityEnName, getCountryEnName } from "@/lib/dataLoader";
import { computeLifePressure } from "@/lib/clientUtils";
import CityDetailContent from "@/components/CityDetailContent";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.values(CITY_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = SLUG_TO_ID[slug];
  if (!id) return { title: "City Not Found" };
  const city = getCityById(id);
  if (!city) return { title: "City Not Found" };
  const enName = getCityEnName(id);
  const country = getCountryEnName(city.country);
  const title = `${enName} Cost of Living, Salary & Quality of Life – City Compare`;
  const description = `${enName}, ${country}: Average salary $${Math.round(city.averageIncome / 1000)}K, monthly cost $${Math.round(city.costModerate).toLocaleString()}, house price $${Math.round(city.housePrice).toLocaleString()}/m², AQI ${city.airQuality}, ${city.doctorsPerThousand} doctors/1K. Compare with 100+ global cities.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    alternates: { canonical: `/city/${slug}` },
  };
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const id = SLUG_TO_ID[slug];
  if (!id) notFound();
  const city = getCityById(id);
  if (!city) notFound();

  const enName = getCityEnName(id);
  const country = getCountryEnName(city.country);

  // Similar cities — Euclidean distance on 16 normalised dimensions (SSG-time)
  const allCities = loadCities();
  const similarIds = computeSimilarIds(city, allCities);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${enName}, ${country}`,
    description: city.description,
    geo: { "@type": "GeoCoordinates" },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Average Income (USD)", value: city.averageIncome },
      { "@type": "PropertyValue", name: "Monthly Cost of Living (USD)", value: city.costModerate },
      { "@type": "PropertyValue", name: "House Price per m² (USD)", value: city.housePrice },
      { "@type": "PropertyValue", name: "Air Quality Index", value: city.airQuality },
      { "@type": "PropertyValue", name: "Doctors per 1,000", value: city.doctorsPerThousand },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CityDetailContent city={city} similarIds={similarIds} slug={slug} allCities={allCities} />
    </>
  );
}

/** Compute the 6 most similar cities by Euclidean distance over 16 normalised dimensions */
function computeSimilarIds(city: City, allCities: City[], topN = 6): number[] {
  // Pre-compute life pressure for all cities using default settings (averageIncome + costModerate)
  const defaultIncomes = allCities.map(c => c.averageIncome);
  const lifePressures = allCities.map(c =>
    computeLifePressure(c, allCities, c.averageIncome, defaultIncomes, "costModerate").value
  );
  const lpMap = new Map(allCities.map((c, i) => [c.id, lifePressures[i]]));

  const vec = (c: City): number[] => {
    const savings = c.averageIncome - c.costModerate * 12;
    const hourlyWage = c.annualWorkHours !== null && c.annualWorkHours > 0 ? c.averageIncome / c.annualWorkHours : 0;
    const yearsToBuy = c.housePrice !== null && savings > 0 ? (c.housePrice * 70) / savings : Infinity;
    return [
      // Row 1 Card 1: 收支
      c.averageIncome,
      c.costModerate,
      savings,
      // Row 1 Card 2: 住房
      c.housePrice ?? 0,
      isFinite(yearsToBuy) ? yearsToBuy : 999,
      c.monthlyRent ?? 0,
      // Row 2 Card 1: 工作
      c.annualWorkHours ?? 0,
      hourlyWage,
      c.paidLeaveDays ?? 0,
      // Row 2 Card 2: 环境与连接
      c.airQuality ?? 0,
      c.internetSpeedMbps ?? 0,
      c.directFlightCities ?? 0,
      // Row 3: 4 指标
      lpMap.get(c.id) ?? 50,
      c.healthcareIndex,
      c.freedomIndex,
      c.safetyIndex,
    ];
  };
  const all = allCities.map(vec);
  const dims = all[0].length;
  const mins = Array(dims).fill(Infinity);
  const maxs = Array(dims).fill(-Infinity);
  for (const m of all) {
    for (let i = 0; i < dims; i++) {
      if (m[i] < mins[i]) mins[i] = m[i];
      if (m[i] > maxs[i]) maxs[i] = m[i];
    }
  }
  const norm = (v: number[]) => v.map((val, i) => {
    const r = maxs[i] - mins[i];
    return r > 0 ? (val - mins[i]) / r : 0.5;
  });
  const cur = norm(vec(city));
  return allCities
    .filter((c) => c.id !== city.id)
    .map((c) => ({ id: c.id, dist: Math.sqrt(norm(vec(c)).reduce((s, v, i) => s + (v - cur[i]) ** 2, 0)) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, topN)
    .map((d) => d.id);
}
