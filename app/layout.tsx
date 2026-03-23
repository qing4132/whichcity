import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "City Compare",
  description: "Compare cities by average income and cost of living",
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
