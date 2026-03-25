import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "City Compare – Global Salary & Cost of Living Comparison",
    template: "%s | City Compare",
  },
  description:
    "Compare 100+ cities worldwide by salary, cost of living, housing prices, air quality, healthcare density. Find the best city for your career and lifestyle.",
  metadataBase: new URL("https://citycompare.app"),
  openGraph: {
    type: "website",
    siteName: "City Compare",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
