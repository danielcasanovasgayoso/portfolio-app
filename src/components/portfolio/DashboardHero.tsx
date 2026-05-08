"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Eye, EyeOff, TrendingDown, TrendingUp } from "lucide-react";
import {
  GlassButton,
  HeroHeader,
  HeroStat,
  Pill,
} from "@/components/pulse";
import { RefreshPricesButton } from "./RefreshPricesButton";
import { formatCurrency, formatPercent, getGainClass } from "@/lib/formatters";
import { getAvatarInitial } from "@/lib/avatarColor";

interface DashboardHeroProps {
  totalNetWorth: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
  email: string;
}

const HIDE_AMOUNTS_STORAGE_KEY = "pt:hide-amounts";

function subscribeHideAmounts(onChange: () => void) {
  const handler = (event: StorageEvent) => {
    if (event.key === HIDE_AMOUNTS_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("pt:hide-amounts-changed", onChange);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("pt:hide-amounts-changed", onChange);
  };
}

function getHideAmounts() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HIDE_AMOUNTS_STORAGE_KEY) === "1";
}

export function DashboardHero({
  totalNetWorth,
  gainLoss,
  gainLossPercent,
  email,
}: DashboardHeroProps) {
  const t = useTranslations("portfolio");
  const hide = useSyncExternalStore(
    subscribeHideAmounts,
    getHideAmounts,
    () => false
  );

  const toggleHide = () => {
    const next = !hide;
    try {
      window.localStorage.setItem(HIDE_AMOUNTS_STORAGE_KEY, next ? "1" : "0");
      window.dispatchEvent(new Event("pt:hide-amounts-changed"));
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  };

  const userName = email.split("@")[0] ?? email;
  const initials = getAvatarInitial(userName);
  const isPositive = getGainClass(gainLoss ?? 0) === "positive";
  const value = totalNetWorth ?? 0;
  const valueDisplay = hide ? "€••••••" : formatCurrency(value);
  const showDelta = !hide && gainLoss != null && gainLossPercent != null;

  return (
    <HeroHeaderShell
      header={
        <HeroHeader
          left={
            <div className="flex items-center gap-2.5 text-white">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.18] text-[12px] font-bold"
                aria-hidden
              >
                {initials}
              </span>
              <div className="leading-tight">
                <div className="text-[11px] text-white/70">{t("welcomeBack")}</div>
                <div className="text-[14px] font-semibold capitalize">{userName}</div>
              </div>
            </div>
          }
          right={
            <>
              <GlassButton
                aria-label={hide ? t("showAmounts") : t("hideAmounts")}
                aria-pressed={hide}
                onClick={toggleHide}
              >
                {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </GlassButton>
              <RefreshPricesButton variant="glass" />
            </>
          }
        />
      }
    >
      <HeroStat
        label={t("totalNetWorth")}
        value={valueDisplay}
        size={46}
        delta={
          showDelta ? (
            <Pill
              variant={isPositive ? "gain" : "loss"}
              icon={
                isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )
              }
            >
              {gainLoss! >= 0 ? "+" : ""}
              {formatCurrency(gainLoss!)} · {formatPercent(gainLossPercent!)}
            </Pill>
          ) : null
        }
        cta={
          <Link
            href="/portfolio/chart"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.18] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
          >
            {t("viewNetWorthDetails")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
    </HeroHeaderShell>
  );
}

function HeroHeaderShell({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {header}
      {children}
    </div>
  );
}
