import type { Metadata } from "next";
import { loadCities } from "@/lib/dataLoader";
import RankingContent from "@/components/RankingContent";

export const metadata: Metadata = {
  title: "Global City Rankings – Savings, Value Index & Housing",
  description:
    "120 cities ranked by annual savings, cost-effectiveness index, and home purchase affordability. Find the best city for your career with real salary and cost data.",
  alternates: { canonical: "/ranking" },
};

export default function RankingPage() {
  const cities = loadCities();
  return <RankingContent cities={cities} />;
}
