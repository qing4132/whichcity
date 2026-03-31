"use client";

export function readUrlParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  p.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function writeUrlParams(state: Record<string, string | undefined>) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => {
    if (value !== undefined && value !== "") p.set(key, value);
  });
  const search = p.toString();
  const url = search
    ? `${window.location.pathname}?${search}`
    : window.location.pathname;
  window.history.replaceState(null, "", url);
}
