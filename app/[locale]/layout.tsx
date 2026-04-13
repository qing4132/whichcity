import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Inter, Noto_Sans_SC } from "next/font/google";
import { LOCALES } from "@/lib/i18nRouting";
import type { Locale } from "@/lib/types";
import { TRANSLATIONS } from "@/lib/i18n";
import "../globals.css";
import WebVitals from "@/components/WebVitals";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const notoSC = Noto_Sans_SC({ weight: "900", subsets: ["latin"], display: "swap", variable: "--font-cjk" });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = (key: string) => TRANSLATIONS[locale as Locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
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

  // The color-scheme meta tag makes the browser's default canvas and
  // form controls match the system preference. Combined with the CSS
  // @media rules in globals.css this eliminates the white flash for
  // "auto" mode users without any JS. For explicit dark/light users
  // the inline <script> adds .dark/.light class before first paint.
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "WhichCity",
            url: "https://whichcity.run",
          }) }}
        />
      </head>
      <body className={`${inter.className} ${notoSC.variable}`} suppressHydrationWarning>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-WW9GZ4ZF2C" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-WW9GZ4ZF2C');`}
        </Script>
        {/* Theme bootstrap — sets .dark/.light on <html> before content paints */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=localStorage.getItem('themeMode');if(!m||['auto','light','dark'].indexOf(m)===-1){var o=localStorage.getItem('darkMode');m=o==='true'?'dark':o==='false'?'light':'auto'}var dk=m==='dark'||(m==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches);d.classList.add(dk?'dark':'light');d.style.colorScheme=dk?'dark':'light'}catch(e){}})()`
          }}
        />
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
