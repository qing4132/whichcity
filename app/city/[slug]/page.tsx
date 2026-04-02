import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { City } from "@/lib/types";
import { SLUG_TO_ID, CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { loadCities, getCityById, getCityEnName, getCountryEnName } from "@/lib/dataLoader";
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
  const title = `${enName} Cost of Living, Salary & Quality of Life – WhichCity`;
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

  // Load all cities for detail page (rankings, similarity, etc.)
  const allCities = loadCities();

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
      <CityDetailContent city={city} slug={slug} allCities={allCities} />
    </>
  );
}
