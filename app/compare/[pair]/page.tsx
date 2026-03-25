import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SLUG_TO_ID, CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { getCityById, getCityClimate, getCityEnName, getCountryEnName, getAqiLabel, getClimateLabel } from "@/lib/dataLoader";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { PROFESSION_TRANSLATIONS } from "@/lib/i18n";

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

function formatUSD(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function pct(a: number, b: number): string {
  if (b === 0) return "N/A";
  const diff = ((a - b) / b) * 100;
  return (diff > 0 ? "+" : "") + diff.toFixed(0) + "%";
}

function profEnName(key: string): string {
  return PROFESSION_TRANSLATIONS[key]?.en || key;
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
  const flagA = CITY_FLAG_EMOJIS[idA] || "🏙️";
  const flagB = CITY_FLAG_EMOJIS[idB] || "🏙️";
  const countryA = getCountryEnName(cityA.country);
  const countryB = getCountryEnName(cityB.country);
  const climateA = getCityClimate(idA);
  const climateB = getCityClimate(idB);

  const expenseA = cityA.costModerate * 12;
  const expenseB = cityB.costModerate * 12;
  const savingsA = cityA.averageIncome - expenseA;
  const savingsB = cityB.averageIncome - expenseB;
  const yearsA = savingsA > 0 ? ((cityA.housePrice * 70) / savingsA).toFixed(1) : "N/A";
  const yearsB = savingsB > 0 ? ((cityB.housePrice * 70) / savingsB).toFixed(1) : "N/A";

  const profKeys = Object.keys(cityA.professions);
  const profData = profKeys
    .map((key) => ({
      name: profEnName(key),
      salaryA: cityA.professions[key] || 0,
      salaryB: cityB.professions[key] || 0,
    }))
    .sort((a, b) => b.salaryA - a.salaryA);

  // Who wins summary
  const wins = {
    income: cityA.averageIncome >= cityB.averageIncome ? "A" : "B",
    cost: cityA.costModerate <= cityB.costModerate ? "A" : "B",
    savings: savingsA >= savingsB ? "A" : "B",
    housing: cityA.housePrice <= cityB.housePrice ? "A" : "B",
    air: cityA.airQuality <= cityB.airQuality ? "A" : "B",
    doctors: cityA.doctorsPerThousand >= cityB.doctorsPerThousand ? "A" : "B",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${nameA} vs ${nameB}: City Comparison`,
    description: `Detailed comparison of ${nameA} and ${nameB} across income, cost of living, housing, and quality of life metrics.`,
  };

  const rows: { label: string; a: string; b: string; winner: "A" | "B" | "tie" }[] = [
    { label: "Average Income", a: formatUSD(cityA.averageIncome), b: formatUSD(cityB.averageIncome), winner: wins.income as "A" | "B" },
    { label: "Monthly Cost (Moderate)", a: formatUSD(cityA.costModerate), b: formatUSD(cityB.costModerate), winner: wins.cost as "A" | "B" },
    { label: "Yearly Savings", a: formatUSD(savingsA), b: formatUSD(savingsB), winner: wins.savings as "A" | "B" },
    { label: "House Price /m²", a: formatUSD(cityA.housePrice), b: formatUSD(cityB.housePrice), winner: wins.housing as "A" | "B" },
    { label: "Years to Buy 70m²", a: String(yearsA), b: String(yearsB), winner: yearsA !== "N/A" && yearsB !== "N/A" ? (Number(yearsA) <= Number(yearsB) ? "A" : "B") : "tie" },
    { label: "Air Quality (AQI)", a: `${cityA.airQuality} – ${getAqiLabel(cityA.airQuality)}`, b: `${cityB.airQuality} – ${getAqiLabel(cityB.airQuality)}`, winner: wins.air as "A" | "B" },
    { label: "Doctors per 1,000", a: String(cityA.doctorsPerThousand), b: String(cityB.doctorsPerThousand), winner: wins.doctors as "A" | "B" },
    { label: "Big Mac Price", a: `$${cityA.bigMacPrice.toFixed(2)}`, b: `$${cityB.bigMacPrice.toFixed(2)}`, winner: cityA.bigMacPrice <= cityB.bigMacPrice ? "A" : "B" },
    { label: "Climate", a: getClimateLabel(climateA.type), b: getClimateLabel(climateB.type), winner: "tie" },
    { label: "Avg Temperature", a: `${climateA.avgTempC.toFixed(1)}°C`, b: `${climateB.avgTempC.toFixed(1)}°C`, winner: "tie" },
    { label: "Sunshine Hours", a: `${Math.round(climateA.sunshineHours)} h`, b: `${Math.round(climateB.sunshineHours)} h`, winner: "tie" },
  ];

  const winsA = Object.values(wins).filter((v) => v === "A").length;
  const winsB = Object.values(wins).filter((v) => v === "B").length;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <nav className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-blue-600 font-semibold hover:underline">← City Compare</Link>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Hero */}
          <header className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <span className="text-4xl">{flagA}</span>
                <p className="text-xl font-bold mt-1">{nameA}</p>
                <p className="text-sm text-slate-500">{countryA}</p>
              </div>
              <span className="text-3xl font-extrabold text-slate-300">VS</span>
              <div className="text-center">
                <span className="text-4xl">{flagB}</span>
                <p className="text-xl font-bold mt-1">{nameB}</p>
                <p className="text-sm text-slate-500">{countryB}</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              {nameA} wins in {winsA} categories, {nameB} wins in {winsB} categories
            </p>
          </header>

          {/* Summary Comparison Table */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Key Metrics Comparison</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Metric</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">{flagA} {nameA}</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">{flagB} {nameB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{row.label}</td>
                        <td className={`px-4 py-2.5 text-center font-semibold ${row.winner === "A" ? "text-green-600 bg-green-50" : "text-slate-700"}`}>
                          {row.a} {row.winner === "A" && "✓"}
                        </td>
                        <td className={`px-4 py-2.5 text-center font-semibold ${row.winner === "B" ? "text-green-600 bg-green-50" : "text-slate-700"}`}>
                          {row.b} {row.winner === "B" && "✓"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Cost of Living Tiers */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Cost of Living (Monthly)</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tier</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">{nameA}</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">{nameB}</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Comfort", a: cityA.costComfort, b: cityB.costComfort },
                    { label: "Moderate", a: cityA.costModerate, b: cityB.costModerate },
                    { label: "Budget", a: cityA.costBudget, b: cityB.costBudget },
                    { label: "Minimal", a: cityA.costMinimal, b: cityB.costMinimal },
                  ].map((t) => (
                    <tr key={t.label} className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{t.label}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{formatUSD(t.a)}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{formatUSD(t.b)}</td>
                      <td className={`px-4 py-2.5 text-center font-semibold ${t.a > t.b ? "text-red-500" : "text-green-600"}`}>
                        {pct(t.a, t.b)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Salary Comparison */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Salary Comparison by Profession</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Profession</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">{nameA}</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">{nameB}</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profData.map((p) => (
                      <tr key={p.name} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                        <td className={`px-4 py-2 text-center font-semibold ${p.salaryA >= p.salaryB ? "text-green-600" : "text-slate-700"}`}>
                          {formatUSD(p.salaryA)}
                        </td>
                        <td className={`px-4 py-2 text-center font-semibold ${p.salaryB >= p.salaryA ? "text-green-600" : "text-slate-700"}`}>
                          {formatUSD(p.salaryB)}
                        </td>
                        <td className="px-4 py-2 text-center text-slate-500">{pct(p.salaryA, p.salaryB)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Links to individual pages */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <Link
              href={`/city/${slugA}`}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow transition"
            >
              <p className="text-2xl mb-1">{flagA}</p>
              <p className="font-bold text-lg text-slate-900">{nameA} City Guide</p>
              <p className="text-sm text-slate-500">{countryA} · Salary, cost of living & quality of life details →</p>
            </Link>
            <Link
              href={`/city/${slugB}`}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow transition"
            >
              <p className="text-2xl mb-1">{flagB}</p>
              <p className="font-bold text-lg text-slate-900">{nameB} City Guide</p>
              <p className="text-sm text-slate-500">{countryB} · Salary, cost of living & quality of life details →</p>
            </Link>
          </section>

          {/* CTA */}
          <section className="text-center py-8 border-t border-slate-200">
            <p className="text-slate-500 mb-3">Compare more cities side-by-side</p>
            <Link
              href={`/?cities=${idA},${idB}`}
              className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Open Full Comparison Tool →
            </Link>
          </section>
        </main>

        <footer className="bg-white border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
          <p>Data sources: ERI/SalaryExpert, BLS, PayScale, Numbeo, WHO/World Bank, IQAir, The Economist</p>
          <p className="mt-1">© {new Date().getFullYear()} City Compare. All data for reference only.</p>
        </footer>
      </div>
    </>
  );
}
