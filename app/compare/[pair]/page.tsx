import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SLUG_TO_ID, CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { getCityById, getCityEnName, getCountryEnName } from "@/lib/dataLoader";
import CompareContent from "@/components/CompareContent";

interface Props {
  params: Promise<{ pair: string }>;
}

function parsePair(pair: string): [string, string] | null {
  const m = pair.match(/^(.+)-vs-(.+)$/);
  if (!m) return null;
  const a = m[1], b = m[2];
  if (SLUG_TO_ID[a] && SLUG_TO_ID[b] && a !== b) return [a, b];
  return null;
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
  const { pair } = await params;
  const slugs = parsePair(pair);
  if (!slugs) return { title: "Comparison Not Found" };
  const [slugA, slugB] = slugs;
  const nameA = getCityEnName(SLUG_TO_ID[slugA]);
  const nameB = getCityEnName(SLUG_TO_ID[slugB]);
  const title = `${nameA} vs ${nameB}: Salary, Cost of Living & Quality of Life Comparison`;
  const cityA = getCityById(SLUG_TO_ID[slugA])!;
  const cityB = getCityById(SLUG_TO_ID[slugB])!;
  const description = `Compare ${nameA} and ${nameB}: income ($${Math.round(cityA.averageIncome / 1000)}K vs $${Math.round(cityB.averageIncome / 1000)}K), monthly cost ($${Math.round(cityA.costModerate)} vs $${Math.round(cityB.costModerate)}), housing, air quality, healthcare, and more.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    alternates: { canonical: `/compare/${pair}` },
  };
}

export default async function ComparePage({ params }: Props) {
  const { pair } = await params;
  const slugs = parsePair(pair);
  if (!slugs) notFound();
  const [slugA, slugB] = slugs;
  const idA = SLUG_TO_ID[slugA];
  const idB = SLUG_TO_ID[slugB];
  const cityA = getCityById(idA);
  const cityB = getCityById(idB);
  if (!cityA || !cityB) notFound();

  const nameA = getCityEnName(idA);
  const nameB = getCityEnName(idB);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${nameA} vs ${nameB}: City Comparison`,
    description: `Detailed comparison of ${nameA} and ${nameB} across income, cost of living, housing, and quality of life metrics.`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareContent cityA={cityA} cityB={cityB} slugA={slugA} slugB={slugB} />
    </>
  );
}
