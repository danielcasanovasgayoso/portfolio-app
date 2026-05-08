import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Avatar,
  GlassButton,
  GlassLink,
  HeroHeader,
  Pill,
} from "@/components/pulse";
import { RefreshAssetButton } from "./RefreshAssetButton";
import { formatCurrency, formatPercent, getGainClass } from "@/lib/formatters";
import type { Holding } from "@/types/portfolio";

interface AssetDetailHeroProps {
  holding: Holding;
}

const CATEGORY_LABEL: Record<Holding["category"], string> = {
  FUNDS: "Fund",
  STOCKS: "Stock",
  PP: "Pension plan",
  OTHERS: "Other",
};

export function AssetDetailHero({ holding }: AssetDetailHeroProps) {
  const t = useTranslations("assetDetail");
  const isPositive = getGainClass(holding.gainLoss) === "positive";
  const seed = holding.ticker || holding.name || holding.id;
  const tickerLine = holding.ticker ?? holding.isin;

  return (
    <div className="relative">
      <HeroHeader
        left={
          <GlassLink href="/" aria-label={t("backToPortfolio")}>
            <ArrowLeft className="h-4 w-4" />
          </GlassLink>
        }
        center={
          <div className="leading-tight">
            <div className="text-[14px] font-bold tracking-tight text-white">
              {tickerLine}
            </div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-white/70">
              {CATEGORY_LABEL[holding.category]}
            </div>
          </div>
        }
        right={
          !holding.manualPricing && holding.assetId ? (
            <RefreshAssetButton assetId={holding.assetId} variant="glass" />
          ) : (
            <GlassButton aria-label={t("backToPortfolio")} disabled className="opacity-0">
              <ArrowLeft className="h-4 w-4" />
            </GlassButton>
          )
        }
      />

      <div className="px-2 text-center text-white">
        <div className="mb-2.5 flex justify-center">
          <Avatar seed={seed} size="lg" />
        </div>
        <h1 className="text-[16px] font-semibold leading-tight text-white">
          {holding.name}
        </h1>
        <div className="mt-3 font-mono text-[38px] font-semibold tracking-[-0.02em] tabular-nums text-white">
          {formatCurrency(holding.marketValue)}
        </div>
        {!holding.manualPricing && (
          <div className="mt-2 flex justify-center">
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
              {holding.gainLoss >= 0 ? "+" : ""}
              {formatCurrency(holding.gainLoss)} · {formatPercent(holding.gainLossPercent)}
            </Pill>
          </div>
        )}
      </div>
    </div>
  );
}
