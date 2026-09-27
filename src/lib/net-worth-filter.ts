// Which domains count towards the dashboard's "Total net worth" figure and
// chart. The selection is a per-device preference stored in a cookie so the
// server renders the filtered total directly (no flash of the full amount).

import { mergeSeries, type SeriesPoint } from "@/lib/series";

export const NET_WORTH_DOMAINS = ["wallet", "investments", "realEstate"] as const;

export type NetWorthDomain = (typeof NET_WORTH_DOMAINS)[number];

export const NET_WORTH_DOMAINS_COOKIE = "net-worth-domains";

/**
 * Parses the cookie value (comma-separated domain ids) into the enabled
 * domains. A missing, empty or fully invalid value falls back to all domains,
 * so the total is never silently empty.
 */
export function parseNetWorthDomains(value: string | undefined): NetWorthDomain[] {
  if (!value) return [...NET_WORTH_DOMAINS];
  const requested = new Set(value.split(","));
  const enabled = NET_WORTH_DOMAINS.filter((d) => requested.has(d));
  return enabled.length > 0 ? enabled : [...NET_WORTH_DOMAINS];
}

export function serializeNetWorthDomains(domains: readonly NetWorthDomain[]): string {
  return NET_WORTH_DOMAINS.filter((d) => domains.includes(d)).join(",");
}

/** Sum of the enabled domains' current values, rounded to cents. */
export function sumNetWorth(
  values: Record<NetWorthDomain, number>,
  enabled: readonly NetWorthDomain[]
): number {
  const total = enabled.reduce((sum, d) => sum + values[d], 0);
  return Math.round(total * 100) / 100;
}

/** Combined evolution series of the enabled domains. */
export function mergeNetWorthHistory(
  histories: Record<NetWorthDomain, SeriesPoint[]>,
  enabled: readonly NetWorthDomain[]
): SeriesPoint[] {
  return mergeSeries(...enabled.map((d) => histories[d]));
}
