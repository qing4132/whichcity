import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { City, Locale } from "@/lib/types";
import { SLUG_TO_ID, CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { loadCities, getCityById, getCityEnName, getCountryEnName, getCityLocaleName, getCountryLocaleName } from "@/lib/dataLoader";
import { getNomadCityData, loadVisaMatrix } from "@/lib/nomadData";
import { LOCALES } from "@/lib/i18nRouting";
import { TRANSLATIONS } from "@/lib/i18n";
import CityDetailContent from "@/components/CityDetailContent";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return Object.values(CITY_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  const id = SLUG_TO_ID[slug];
  if (!id) return { title: "City Not Found" };
  const city = getCityById(id);
  if (!city) return { title: "City Not Found" };
  const cityName = getCityLocaleName(id, loc);
  const country = getCountryLocaleName(city.country, loc);
  const t = (key: string) => TRANSLATIONS[loc]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  const title = t("metaCityTitle").replace("{city}", cityName);
  const description = t("metaCityDesc")
    .replace("{city}", cityName)
    .replace("{country}", country)
    .replace("{salary}", String(Math.round(city.averageIncome / 1000)))
    .replace("{cost}", Math.round(city.costModerate).toLocaleString())
    .replace("{house}", Math.round(city.housePrice).toLocaleString())
    .replace("{aqi}", String(city.airQuality))
    .replace("{doctors}", String(city.doctorsPerThousand));
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    alternates: {
      canonical: `/${locale}/city/${slug}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `/${l}/city/${slug}`])),
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { locale, slug } = await params;
  const id = SLUG_TO_ID[slug];
  if (!id) notFound();
  const city = getCityById(id);
  if (!city) notFound();

  const enName = getCityEnName(id);
  const country = getCountryEnName(city.country);

  // Load all cities for detail page (rankings, similarity, etc.)
  const allCities = loadCities();
  const nomadData = getNomadCityData(id);
  const visaMatrix = loadVisaMatrix();

  const jsonLd = [
    {
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
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "WhichCity", item: `https://whichcity.run/${locale}` },
        { "@type": "ListItem", position: 2, name: enName, item: `https://whichcity.run/${locale}/city/${slug}` },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CityDetailContent city={city} slug={slug} allCities={allCities} locale={locale} nomadData={nomadData} visaMatrix={visaMatrix} />
    </>
  );
}
