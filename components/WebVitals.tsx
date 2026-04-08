"use client";

import { useEffect } from "react";
import { onCLS, onINP, onLCP } from "web-vitals";

function sendToGA(name: string, value: number) {
  if (typeof gtag === "function") {
    gtag("event", name, {
      value: Math.round(name === "CLS" ? value * 1000 : value),
      event_category: "Web Vitals",
      non_interaction: true,
    });
  }
}

export default function WebVitals() {
  useEffect(() => {
    onCLS((m) => sendToGA("CLS", m.value));
    onINP((m) => sendToGA("INP", m.value));
    onLCP((m) => sendToGA("LCP", m.value));
  }, []);
  return null;
}
