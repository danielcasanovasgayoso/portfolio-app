import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SubPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getPropertyDetail } from "@/services/real-estate.service";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { AmortizationTable } from "@/components/real-estate/AmortizationTable";
import { ValuationsManager } from "@/components/real-estate/ValuationsManager";
import { AmortizationsManager } from "@/components/real-estate/AmortizationsManager";
import { PropertyActions } from "@/components/real-estate/PropertyActions";
import {
  RealEstateChart,
  type RealEstateChartPoint,
} from "@/components/real-estate/RealEstateChart";
import type { PropertyDetail } from "@/types/real-estate";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Builds the value-over-time series: mortgage balance plus a linearly interpolated
 * market value between real valuations (flat after the last one). Real valuation
 * dates are flagged so the chart can mark them.
 */
function buildChartData(property: PropertyDetail): RealEstateChartPoint[] {
  const valuations = [...property.valuations].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Linear interpolation between surrounding valuations; null before the first,
  // flat (last value) after the last.
  const interpolateValuation = (date: string): number | null => {
    if (valuations.length === 0) return null;
    if (date < valuations[0].date) return null;
    const last = valuations[valuations.length - 1];
    if (date >= last.date) return last.value;
    for (let i = 0; i < valuations.length - 1; i++) {
      const a = valuations[i];
      const b = valuations[i + 1];
      if (date >= a.date && date <= b.date) {
        const ta = new Date(a.date).getTime();
        const tb = new Date(b.date).getTime();
        const td = new Date(date).getTime();
        const frac = tb === ta ? 0 : (td - ta) / (tb - ta);
        return round2(a.value + (b.value - a.value) * frac);
      }
    }
    return null;
  };

  const valuationDates = new Set(valuations.map((v) => v.date));

  if (property.schedule.length > 0) {
    // Most-recent payment balance on or before the given date.
    const balanceAt = (date: string): number => {
      let bal = property.mortgage!.loanAmount;
      for (const row of property.schedule) {
        if (row.paymentDate <= date) bal = row.balance;
        else break;
      }
      return bal;
    };

    // Merge monthly schedule dates with real valuation dates onto one axis.
    const dates = new Set<string>(property.schedule.map((r) => r.paymentDate));
    for (const v of valuations) dates.add(v.date);
    const sorted = [...dates].sort((a, b) => a.localeCompare(b));

    return sorted.map((date) => {
      const marketValue = interpolateValuation(date);
      const balance = balanceAt(date);
      return {
        date,
        balance,
        marketValue,
        equity: marketValue != null ? round2(marketValue - balance) : null,
        isValuation: valuationDates.has(date),
      };
    });
  }

  // No mortgage: plot the valuations (Recharts joins them linearly).
  return valuations.map((v) => ({
    date: v.date,
    balance: null,
    marketValue: v.value,
    equity: v.value,
    isValuation: true,
  }));
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-lg font-bold ${
            accent ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-bold" : "font-semibold"}>{value}</span>
    </div>
  );
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const t = await getTranslations("realEstate");
  const property = await getPropertyDetail(user.id, id);

  if (!property) notFound();

  const { acquisition, mortgageSummary } = property;
  const chartData = buildChartData(property);

  return (
    <div className="min-h-screen pb-nav">
      <SubPageHeader
        title={property.name}
        backHref="/real-estate"
        backLabel={t("back")}
        actions={<PropertyActions propertyId={property.id} />}
      />

      <main className="p-4 space-y-4 max-w-5xl mx-auto">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryStat label={t("acquisitionCost")} value={formatCurrency(acquisition.total)} />
          <SummaryStat
            label={t("marketValue")}
            value={property.marketValue != null ? formatCurrency(property.marketValue) : "—"}
          />
          <SummaryStat
            label={t("equity")}
            value={property.equity != null ? formatCurrency(property.equity) : "—"}
            accent
          />
          <SummaryStat
            label={t("monthlyPayment")}
            value={
              mortgageSummary ? formatCurrency(mortgageSummary.monthlyPayment) : "—"
            }
          />
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("valueOverTime")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RealEstateChart
                data={chartData}
                labels={{
                  balance: t("mortgageBalance"),
                  marketValue: t("marketValue"),
                  equity: t("equity"),
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Acquisition cost */}
        <Card>
          <CardHeader>
            <CardTitle>{t("acquisitionCost")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label={`${t("purchasePrice")} (${t("excludingTaxes")})`} value={formatCurrency(acquisition.purchasePrice)} />
            <Row label={`${t("vat")} (${formatPercent(property.vatRate).replace("+", "")})`} value={formatCurrency(acquisition.vat)} />
            <Row label={`${t("transferTax")} (${formatPercent(property.transferTaxRate).replace("+", "")})`} value={formatCurrency(acquisition.transferTax)} />
            <Row label={t("purchaseCosts")} value={formatCurrency(acquisition.purchaseCosts)} />
            <Row label={t("acquisitionCost")} value={formatCurrency(acquisition.total)} strong />
          </CardContent>
        </Card>

        {/* Mortgage summary */}
        {mortgageSummary && (
          <Card>
            <CardHeader>
              <CardTitle>{t("mortgageSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label={t("loanAmount")} value={formatCurrency(property.mortgage!.loanAmount)} />
              <Row label={t("downPayment")} value={formatCurrency(mortgageSummary.downPayment)} />
              <Row label={t("monthlyPayment")} value={formatCurrency(mortgageSummary.monthlyPayment)} />
              <Row label={t("remainingBalance")} value={formatCurrency(mortgageSummary.remainingBalance)} strong />
              <Row label={t("pendingQuotas")} value={String(mortgageSummary.pendingQuotas)} />
              <Row label={t("remainingYears")} value={String(mortgageSummary.remainingYears)} />
              <Row label={t("totalInterest")} value={formatCurrency(mortgageSummary.totalInterest)} />
              <Row label={t("paidToDate")} value={formatCurrency(mortgageSummary.paidToDate)} />
            </CardContent>
          </Card>
        )}

        {/* Owner splits */}
        {property.ownerSplits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("ownerSplit")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {property.ownerSplits.map((o) => (
                <div key={o.ownerId} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{o.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {o.sharePct}%
                    </span>
                  </div>
                  <Row label={t("downPayment")} value={formatCurrency(o.downPayment)} />
                  <Row label={t("paidToDate")} value={formatCurrency(o.paidToDate)} />
                  <Row label={t("invested")} value={formatCurrency(o.invested)} />
                  <Row label={t("remainingBalance")} value={formatCurrency(o.remainingBalance)} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Valuations */}
        <Card>
          <CardHeader>
            <CardTitle>{t("valuations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ValuationsManager propertyId={property.id} valuations={property.valuations} />
          </CardContent>
        </Card>

        {/* Partial amortizations + schedule */}
        {mortgageSummary && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("amortizations")}</CardTitle>
              </CardHeader>
              <CardContent>
                <AmortizationsManager
                  propertyId={property.id}
                  amortizations={property.mortgage!.partialAmortizations}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("amortizationSchedule")}</CardTitle>
              </CardHeader>
              <CardContent>
                <AmortizationTable schedule={property.schedule} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
