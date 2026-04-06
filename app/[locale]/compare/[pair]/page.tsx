import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SLUG_TO_ID, CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { getCityById, getCityEnName, loadCities } from "@/lib/dataLoader";
import { LOCALES } from "@/lib/i18nRouting";
import CompareContent from "@/components/CompareContent";

interface Props {
  params: Promise<{ locale: string; pair: string }>;
}

function parsePair(pair: string): string[] | null {
  const parts = pair.split("-vs-");
  const valid = parts.filter(s => SLUG_TO_ID[s] != null);
  const unique = [...new Set(valid)];
  return unique.length >= 1 ? unique : null;
}

export async function generateStaticParams() {
  const seen = new Set<string>();
  return POPULAR_PAIRS.map(([a, b]) => {
    const pair = [CITY_SLUGS[a], CITY_SLUGS[b]].sort().join("-vs-");
    if (seen.has(pair)) return null;
    seen.add(pair);
    return { pair };
  }).filter(Boolean) as { pair: string }[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, pair } = await params;
  const slugs = parsePair(pair);
  if (!slugs) return { title: "Comparison Not Found" };
  const names = slugs.map(s => getCityEnName(SLUG_TO_ID[s]));
  const title = `${names.join(" vs ")}: Salary, Cost of Living & Quality of Life Comparison`;
  const cities = slugs.map(s => getCityById(SLUG_TO_ID[s])!);
  const description = `Compare ${names.join(", ")}: income, monthly cost, housing, safety, healthcare, and more.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    alternates: {
      canonical: `/${locale}/compare/${pair}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `/${l}/compare/${pair}`])),
    },
  };
}

export default async function ComparePage({ params }: Props) {
  const { locale, pair } = await params;
  const slugs = parsePair(pair);
  if (!slugs) notFound();
  const initialCities = slugs.map(s => getCityById(SLUG_TO_ID[s])!);
  if (initialCities.some(c => !c)) notFound();
  const allCities = loadCities();
  const names = slugs.map(s => getCityEnName(SLUG_TO_ID[s]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${names.join(" vs ")}: City Comparison`,
    description: `Detailed comparison of ${names.join(", ")} across income, cost of living, housing, and quality of life metrics.`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareContent initialCities={initialCities} initialSlugs={slugs} allCities={allCities} locale={locale} />
    </>
  );
}
