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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var l=localStorage.getItem('locale');if(l&&['zh','en','ja','es'].indexOf(l)!==-1)d.lang=l;if(localStorage.getItem('darkMode')==='true'){d.classList.add('dark');d.style.colorScheme='dark'}}catch(e){}})()`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
