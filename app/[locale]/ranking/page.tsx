import type { Metadata } from "next";
import { loadCities } from "@/lib/dataLoader";
import { LOCALES } from "@/lib/i18nRouting";
import { TRANSLATIONS } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import RankingContent from "@/components/RankingContent";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const loc = locale as Locale;
  const t = (key: string) => TRANSLATIONS[loc]?.[key] || TRANSLATIONS.en[key] || key;
  const title = t("metaRankingTitle");
  const description = t("metaRankingDesc");
  return {
    title,
    description,
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
