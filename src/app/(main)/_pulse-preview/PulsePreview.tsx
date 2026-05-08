"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Eye,
  Globe,
  HelpCircle,
  Key,
  Mail,
  Palette,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  Avatar,
  Donut,
  GlassButton,
  HeroBackdrop,
  HeroHeader,
  HeroStat,
  MobileShell,
  Pill,
  SectionCard,
  SegmentedControl,
  SettingsRow,
  SettingsSection,
  WeightBar,
} from "@/components/pulse";
import { useState } from "react";

const allocation = [
  { label: "Funds", pct: 42, color: "#4F46E5" },
  { label: "Stocks & ETFs", pct: 28, color: "#7C3AED" },
  { label: "Pension", pct: 18, color: "#06B6D4" },
  { label: "Cash", pct: 12, color: "#10B981" },
];

export function PulsePreview() {
  const [period, setPeriod] = useState<"1D" | "1W" | "1M" | "YTD" | "1Y" | "All">("YTD");
  const [appearance, setAppearance] = useState<"System" | "Light" | "Dark">("System");

  return (
    <MobileShell>
      <HeroBackdrop height={360} orbits="right" />

      <div className="relative px-5 pt-3">
        <HeroHeader
          left={
            <Avatar seed="DC" label="DC" color="rgba(255,255,255,0.18)" size="sm" />
          }
          right={
            <>
              <GlassButton aria-label="Hide amounts">
                <Eye className="h-4 w-4" />
              </GlassButton>
              <GlassButton aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </GlassButton>
              <GlassButton aria-label="Refresh prices">
                <RefreshCw className="h-4 w-4" />
              </GlassButton>
            </>
          }
        />

        <HeroStat
          label="Total net worth"
          value="€124,832.40"
          delta={
            <Pill variant="gain" icon={<TrendingUp className="h-3 w-3" />}>
              +€8,420.12 · +7.83%
            </Pill>
          }
          cta={
            <button className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.18] px-3.5 py-2 text-xs font-semibold text-white">
              View net worth details <ArrowRight className="h-3 w-3" />
            </button>
          }
        />

        <div className="mt-4">
          <SegmentedControl
            options={["1D", "1W", "1M", "YTD", "1Y", "All"] as const}
            value={period}
            onChange={setPeriod}
            variant="glass"
            font="mono"
            ariaLabel="Period"
          />
        </div>

        <div className="mt-5">
          <SectionCard>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h3 className="text-[15px] font-semibold">Allocation</h3>
                <span className="label-sm">Across 4 classes</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Donut slices={allocation} label="€92.5K" sublabel="TOTAL" />
              <div className="flex flex-1 flex-col gap-2">
                {allocation.map((a) => (
                  <div key={a.label} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden
                      className="h-4 w-1.5 rounded-sm"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="font-semibold">{a.label}</span>
                    <span className="ml-auto font-mono font-bold tabular-nums">
                      {a.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="mt-5 space-y-3">
          <h3 className="px-1 text-[15px] font-semibold">Holdings</h3>
          <div className="flex items-center gap-3 rounded-2xl bg-card p-3 ghost-border shadow-sm">
            <Avatar seed="ASML" size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-semibold">
                  ASML · ASML Holding
                </span>
                <span className="font-mono text-[13px] font-bold tabular-nums">
                  €11,176.18
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>€812.30 · 9.0% · 23.04.2026</span>
                <Pill variant="gain" icon={<TrendingUp className="h-3 w-3" />}>
                  +14.20%
                </Pill>
              </div>
              <div className="mt-2">
                <WeightBar pct={45} />
              </div>
            </div>
          </div>
        </div>

        <SettingsSection title="Preferences">
          <SettingsRow
            icon={Palette}
            title="Appearance"
            sub="System, light, or dark"
            trailing={
              <SegmentedControl
                options={["System", "Light", "Dark"] as const}
                value={appearance}
                onChange={setAppearance}
                className="w-44"
                ariaLabel="Appearance"
              />
            }
            hideChevron
          />
          <SettingsRow icon={Globe} title="Language" sub="Display language" value="English" />
          <SettingsRow icon={Key} title="EODHD API key" sub="Market data provider" value="•••• abc4" />
          <SettingsRow icon={Mail} title="Gmail import" sub="MyInvestor transactions" value="Connected" />
          <SettingsRow icon={HelpCircle} title="Help" sub="Read the docs" />
          <SettingsRow icon={Trash2} title="Reset all data" sub="Irreversible" danger last />
        </SettingsSection>

        <div className="mt-6 flex flex-wrap gap-2">
          <Pill variant="gain">+1.23%</Pill>
          <Pill variant="loss">-0.42%</Pill>
          <Pill variant="type-buy">BUY</Pill>
          <Pill variant="type-sell">SELL</Pill>
          <Pill variant="type-dividend">DIVIDEND</Pill>
          <Pill variant="type-fee">FEE</Pill>
          <Pill variant="neutral">NEUTRAL</Pill>
        </div>

        <div className="mt-4 flex gap-2">
          <GlassButton aria-label="Back" className="bg-primary text-white">
            <ArrowLeft className="h-4 w-4" />
          </GlassButton>
          <Avatar seed="DC" size="md" />
          <Avatar seed="ASML" size="lg" />
        </div>
      </div>
    </MobileShell>
  );
}
