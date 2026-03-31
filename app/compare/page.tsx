import type { Metadata } from "next";
import { loadCities } from "@/lib/dataLoader";
import CompareContent from "@/components/CompareContent";

export const metadata: Metadata = {
  title: "City Comparison Tool — Compare Cities Side by Side",
  description: "Compare cities by income, cost of living, housing, safety, healthcare and more.",
};

export default function CompareIndexPage() {
  const allCities = loadCities();
  return <CompareContent initialCities={[]} initialSlugs={[]} allCities={allCities} />;
}
