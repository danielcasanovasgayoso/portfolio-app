"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/**
 * Whether the user prefers reduced motion. CSS animations are already
 * neutralized globally (see globals.css); this hook is for JS-driven
 * animations that CSS can't reach, e.g. Recharts' SVG entrance draws.
 * SSR renders `false` and corrects on hydration before any chart mounts.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
