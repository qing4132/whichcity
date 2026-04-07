/* ── GA4 custom event helper ── */

declare global {
  // eslint-disable-next-line no-unused-vars
  function gtag(...args: unknown[]): void;
}

export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof gtag === "function") gtag("event", name, params);
}
