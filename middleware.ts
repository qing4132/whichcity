import { NextRequest, NextResponse } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "./lib/i18nRouting";

const localeSet = new Set<string>(LOCALES);

/** Paths that should never be locale-prefixed */
const IGNORED = /^\/(_next|api|data|favicon\.ico|robots\.txt|sitemap\.xml|images|icons)/;

function getPreferredLocale(request: NextRequest): string {
  // 1. Cookie preference
  const cookie = request.cookies.get("locale")?.value;
  if (cookie && localeSet.has(cookie)) return cookie;

  // 2. Accept-Language header
  const acceptLang = request.headers.get("accept-language") || "";
  for (const part of acceptLang.split(",")) {
    const lang = part.split(";")[0].trim().split("-")[0].toLowerCase();
    if (localeSet.has(lang)) return lang;
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (IGNORED.test(pathname)) return;

  // Check if pathname already has a locale prefix
  const segments = pathname.split("/");
  const firstSegment = segments[1]; // "" for "/", "en" for "/en/..."

  if (localeSet.has(firstSegment)) {
    // Already has locale — set cookie to remember choice, then continue
    const response = NextResponse.next();
    response.cookies.set("locale", firstSegment, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // No locale prefix — redirect to preferred locale
  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next|api|data|favicon\\.ico|robots\\.txt|sitemap\\.xml|images|icons).*)"],
};
