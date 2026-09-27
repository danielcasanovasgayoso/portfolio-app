"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PriceChart } from "@/components/charts";
import { formatCurrency } from "@/lib/formatters";
import {
  NET_WORTH_DOMAINS_COOKIE,
  mergeNetWorthHistory,
  serializeNetWorthDomains,
  sumNetWorth,
  type NetWorthDomain,
} from "@/lib/net-worth-filter";
import type { SeriesPoint } from "@/lib/series";
import { cn } from "@/lib/utils";

export interface NetWorthHeroDomain {
  id: NetWorthDomain;
  label: string;
  color: string;
  value: number;
  history: SeriesPoint[];
}

interface NetWorthHeroProps {
  domains: NetWorthHeroDomain[];
  /** Enabled domains read from the cookie on the server. */
  initialEnabled: NetWorthDomain[];
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function persistEnabled(domains: NetWorthDomain[]) {
  document.cookie = `${NET_WORTH_DOMAINS_COOKIE}=${serializeNetWorthDomains(
    domains
  )}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Net-worth hero with one toggle chip per domain, so the total and its
 * evolution chart can exclude e.g. cash or investments. The selection is
 * persisted per-device in a cookie that the server reads on the next render.
 */
export function NetWorthHero({ domains, initialEnabled }: NetWorthHeroProps) {
  const t = useTranslations("dashboard");

  // Only domains holding something are worth toggling; an empty one would
  // change nothing.
  const available = domains.filter((d) => d.value !== 0 || d.history.length > 0);
  const [selected, setSelected] = useState<NetWorthDomain[]>(initialEnabled);

  // Ignore stored selections for domains that are now empty; if that leaves
  // nothing, count every available domain rather than show a zero total.
  const selectedAvailable = available
    .map((d) => d.id)
    .filter((id) => selected.includes(id));
  const enabled =
    selectedAvailable.length > 0 ? selectedAvailable : available.map((d) => d.id);

  const values = {} as Record<NetWorthDomain, number>;
  const histories = {} as Record<NetWorthDomain, SeriesPoint[]>;
  for (const d of domains) {
    values[d.id] = d.value;
    histories[d.id] = d.history;
  }
  const total = sumNetWorth(values, enabled);
  const history = mergeNetWorthHistory(histories, enabled);

  const toggle = (id: NetWorthDomain) => {
    const isOn = enabled.includes(id);
    // Keep at least one domain in the total.
    if (isOn && enabled.length === 1) return;
    const next = isOn ? enabled.filter((d) => d !== id) : [...enabled, id];
    setSelected(next);
    persistEnabled(next);
  };

  return (
    <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8">
      <span className="label-sm block mb-3 sm:mb-6">{t("netWorth")}</span>
      <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground sensitive-amount mb-2">
        {formatCurrency(total)}
      </p>
      {available.length > 1 && (
        <div
          role="group"
          aria-label={t("includeInTotal")}
          className="flex flex-wrap gap-2 mb-4"
        >
          {available.map((d) => {
            const isOn = enabled.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(d.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 rounded-full border px-3 text-xs font-medium transition-colors",
                  isOn
                    ? "border-white/25 bg-white/15 text-foreground"
                    : "border-white/15 bg-transparent text-foreground/55"
                )}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full border"
                  style={{
                    borderColor: d.color,
                    backgroundColor: isOn ? d.color : "transparent",
                  }}
                />
                {d.label}
              </button>
            );
          })}
        </div>
      )}
      {history.length > 1 && (
        <PriceChart data={history} showTimeframes variant="onDark" />
      )}
    </article>
  );
}
