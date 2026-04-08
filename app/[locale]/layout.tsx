import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { LOCALES } from "@/lib/i18nRouting";
import type { Locale } from "@/lib/types";
import { TRANSLATIONS } from "@/lib/i18n";
import "../globals.css";
import WebVitals from "@/components/WebVitals";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = (key: string) => TRANSLATIONS[locale as Locale]?.[key] || TRANSLATIONS.en[key] || key;
  return {
    title: {
      default: t("metaSiteTitle"),
      template: "%s | WhichCity",
    },
    description: t("metaSiteDesc"),
    metadataBase: new URL("https://whichcity.run"),
    openGraph: {
      type: "website",
      siteName: "WhichCity",
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "WhichCity",
            url: "https://whichcity.run",
          }) }}
        />
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
      <body className={inter.className} suppressHydrationWarning>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
