import type { Metadata } from "next";
import { LOCALES } from "@/lib/i18nRouting";
import { TRANSLATIONS } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import MethodologyContent from "@/components/MethodologyContent";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const loc = locale as Locale;
  const t = (key: string) => TRANSLATIONS[loc]?.[key] || TRANSLATIONS.en[key] || key;
  const title = t("metaMethodTitle");
  const description = t("metaMethodDesc");
  return {
    title,
    description,
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
