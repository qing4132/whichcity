import type { Metadata } from "next";
import { LOCALES } from "@/lib/i18nRouting";
import MethodologyContent from "@/components/MethodologyContent";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Methodology, Data Sources & Disclaimer",
    description:
      "Complete documentation of WhichCity's data sources, calculation methods, index formulas, display rules, and legal disclaimers.",
    alternates: {
      canonical: `/${locale}/methodology`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `/${l}/methodology`])),
    },
  };
}

export default async function MethodologyPage({ params }: Props) {
  const { locale } = await params;
  return <MethodologyContent locale={locale} />;
}
