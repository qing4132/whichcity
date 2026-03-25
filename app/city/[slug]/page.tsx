import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SLUG_TO_ID, CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { loadCities, getCityById, getCityClimate, getCityEnName, getCountryEnName, getAqiLabel, getClimateLabel } from "@/lib/dataLoader";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { PROFESSION_TRANSLATIONS } from "@/lib/i18n";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.values(CITY_SLUGS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = SLUG_TO_ID[slug];
  if (!id) return { title: "City Not Found" };
  const city = getCityById(id);
  if (!city) return { title: "City Not Found" };
  const enName = getCityEnName(id);
  const country = getCountryEnName(city.country);
  const title = `${enName} Cost of Living, Salary & Quality of Life – City Compare`;
  const description = `${enName}, ${country}: Average salary $${Math.round(city.averageIncome / 1000)}K, monthly cost $${Math.round(city.costModerate).toLocaleString()}, house price $${Math.round(city.housePrice).toLocaleString()}/m², AQI ${city.airQuality}, ${city.doctorsPerThousand} doctors/1K. Compare with 100+ global cities.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    alternates: { canonical: `/city/${slug}` },
  };
}

function formatUSD(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function profEnName(key: string): string {
  return PROFESSION_TRANSLATIONS[key]?.en || key;
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const id = SLUG_TO_ID[slug];
  if (!id) notFound();
  const city = getCityById(id);
  if (!city) notFound();

  const enName = getCityEnName(id);
  const country = getCountryEnName(city.country);
  const flag = CITY_FLAG_EMOJIS[id] || "🏙️";
  const climate = getCityClimate(id);
  const aqiLabel = getAqiLabel(city.airQuality);

  const professions = Object.entries(city.professions)
    .map(([key, salary]) => ({ key, salary, enName: profEnName(key) }))
    .sort((a, b) => b.salary - a.salary);

  const annualExpense = city.costModerate * 12;
  const savings = city.averageIncome - annualExpense;
  const savingsRate = city.averageIncome > 0 ? ((savings / city.averageIncome) * 100).toFixed(1) : "0";
  const yearsToHome = savings > 0 ? ((city.housePrice * 70) / savings).toFixed(1) : "N/A";

  // Related comparison links
  const allCities = loadCities();
  const related = POPULAR_PAIRS
    .filter(([a, b]) => a === id || b === id)
    .map(([a, b]) => (a === id ? b : a))
    .slice(0, 6);
  // If fewer than 6, fill with same-continent cities
  if (related.length < 6) {
    const sameContinentIds = allCities
      .filter((c) => c.continent === city.continent && c.id !== id && !related.includes(c.id))
      .slice(0, 6 - related.length)
      .map((c) => c.id);
    related.push(...sameContinentIds);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${enName}, ${country}`,
    description: city.description,
    geo: { "@type": "GeoCoordinates" },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Average Income (USD)", value: city.averageIncome },
      { "@type": "PropertyValue", name: "Monthly Cost of Living (USD)", value: city.costModerate },
      { "@type": "PropertyValue", name: "House Price per m² (USD)", value: city.housePrice },
      { "@type": "PropertyValue", name: "Air Quality Index", value: city.airQuality },
      { "@type": "PropertyValue", name: "Doctors per 1,000", value: city.doctorsPerThousand },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/* Nav */}
        <nav className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-blue-600 font-semibold hover:underline">
              ← City Compare
            </Link>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Hero */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{flag}</span>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                  {enName}
                </h1>
                <p className="text-lg text-slate-500">{country}</p>
              </div>
            </div>
            <p className="mt-4 text-slate-600 max-w-2xl leading-relaxed">{city.description}</p>
          </header>

          {/* Key Stats Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {[
              { label: "Avg. Income", value: formatUSD(city.averageIncome), sub: "/year" },
              { label: "Monthly Cost", value: formatUSD(city.costModerate), sub: "moderate" },
              { label: "Yearly Savings", value: formatUSD(savings), sub: `${savingsRate}% rate` },
              { label: "House Price", value: formatUSD(city.housePrice), sub: "/m²" },
              { label: "Air Quality", value: `AQI ${city.airQuality}`, sub: aqiLabel },
              { label: "Doctors/1K", value: String(city.doctorsPerThousand), sub: "physicians" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </section>

          {/* Cost of Living Tiers */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Cost of Living by Lifestyle</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Comfort", cost: city.costComfort, desc: "Premium lifestyle" },
                { label: "Moderate", cost: city.costModerate, desc: "Average standard" },
                { label: "Budget", cost: city.costBudget, desc: "Cost-conscious" },
                { label: "Minimal", cost: city.costMinimal, desc: "Bare essentials" },
              ].map((tier) => (
                <div key={tier.label} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-700">{tier.label}</p>
                  <p className="text-2xl font-extrabold text-blue-600 mt-1">{formatUSD(tier.cost)}</p>
                  <p className="text-xs text-slate-400">/month · {tier.desc}</p>
                  <p className="text-xs text-slate-500 mt-1">Annual: {formatUSD(tier.cost * 12)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Salary Distribution */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Salary by Profession (USD/year)</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Profession</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Annual Salary</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Monthly Net*</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Savings Potential</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professions.map(({ key, salary, enName: name }) => {
                      const monthlySavings = salary / 12 - city.costModerate;
                      return (
                        <tr key={key} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-800">{name}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                            {formatUSD(salary)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {formatUSD(salary / 12)}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${monthlySavings > 0 ? "text-green-600" : "text-red-500"}`}>
                            {formatUSD(monthlySavings)}/mo
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                * Estimated gross monthly salary before tax. Savings based on moderate cost tier.
              </p>
            </div>
          </section>

          {/* Housing & Quality */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            {/* Housing */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">🏠 Housing</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Price per m²</span>
                  <span className="font-bold">{formatUSD(city.housePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">70m² apartment</span>
                  <span className="font-bold">{formatUSD(city.housePrice * 70)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Years to purchase (avg income)</span>
                  <span className="font-bold">{yearsToHome} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Big Mac Price</span>
                  <span className="font-bold">${city.bigMacPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Climate & Environment */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">🌤️ Climate & Environment</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Climate Type</span>
                  <span className="font-bold">{getClimateLabel(climate.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Avg Temperature</span>
                  <span className="font-bold">{climate.avgTempC.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Annual Rainfall</span>
                  <span className="font-bold">{Math.round(climate.annualRainMm)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sunshine Hours</span>
                  <span className="font-bold">{Math.round(climate.sunshineHours)} h/year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Air Quality (AQI)</span>
                  <span className="font-bold">{city.airQuality} – {aqiLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Doctors per 1,000</span>
                  <span className="font-bold">{city.doctorsPerThousand}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Compare with other cities */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Compare {enName} with…</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {related.map((otherId) => {
                const other = getCityById(otherId);
                if (!other) return null;
                const otherSlug = CITY_SLUGS[otherId];
                const otherName = getCityEnName(otherId);
                const pair = [slug, otherSlug].sort().join("-vs-");
                return (
                  <Link
                    key={otherId}
                    href={`/compare/${pair}`}
                    className="bg-white rounded-xl border border-slate-200 p-3 text-center hover:border-blue-400 hover:shadow transition"
                  >
                    <span className="text-2xl">{CITY_FLAG_EMOJIS[otherId] || "🏙️"}</span>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{otherName}</p>
                    <p className="text-xs text-blue-600 mt-0.5">vs {enName} →</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Back to tool */}
          <section className="text-center py-8 border-t border-slate-200">
            <p className="text-slate-500 mb-3">Want to compare multiple cities side-by-side?</p>
            <Link
              href={`/?cities=${id}`}
              className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Open Full Comparison Tool →
            </Link>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
          <p>Data sources: ERI/SalaryExpert, BLS, PayScale, Numbeo, WHO/World Bank, IQAir, The Economist</p>
          <p className="mt-1">© {new Date().getFullYear()} City Compare. All data for reference only.</p>
        </footer>
      </div>
    </>
  );
}
