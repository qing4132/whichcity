import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { LOCALES } from "@/lib/i18nRouting";
import type { Locale } from "@/lib/types";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "WhichCity – Global Salary & Cost of Living Comparison",
    template: "%s | WhichCity",
  },
  description:
    "Compare 100+ cities worldwide by salary, cost of living, housing prices, air quality, healthcare density. Find the best city for your career and lifestyle.",
  metadataBase: new URL("https://whichcity.run"),
  openGraph: {
    type: "website",
    siteName: "WhichCity",
  },
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-WW9GZ4ZF2C" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-WW9GZ4ZF2C');`
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=localStorage.getItem('themeMode');if(!m||['auto','light','dark'].indexOf(m)===-1){var o=localStorage.getItem('darkMode');m=o==='true'?'dark':o==='false'?'light':'auto'}var dk=m==='dark'||(m==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(dk){d.classList.add('dark');d.style.colorScheme='dark'}}catch(e){}})()`
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
