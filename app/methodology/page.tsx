import type { Metadata } from "next";
import MethodologyContent from "@/components/MethodologyContent";

export const metadata: Metadata = {
  title: "Methodology, Data Sources & Disclaimer",
  description:
    "Complete documentation of City Compare's data sources, calculation methods, index formulas, display rules, and legal disclaimers.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return <MethodologyContent />;
}
