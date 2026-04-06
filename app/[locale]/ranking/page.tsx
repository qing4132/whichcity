import type { Metadata } from "next";
import { loadCities } from "@/lib/dataLoader";
import { LOCALES } from "@/lib/i18nRouting";
import RankingContent from "@/components/RankingContent";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Global City Rankings – Savings, Value Index & Housing",
    description:
      "120 cities ranked by annual savings, cost-effectiveness index, and home purchase affordability. Find the best city for your career with real salary and cost data.",
    alternates: {
      canonical: `/${locale}/ranking`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `/${l}/ranking`])),
    },
  };
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RankingPage({ params }: Props) {
  const { locale } = await params;
  const cities = loadCities();
  return <RankingContent cities={cities} locale={locale} />;
}
