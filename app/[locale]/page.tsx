import HomeContent from "@/components/HomeContent";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  return <HomeContent locale={locale} />;
}
