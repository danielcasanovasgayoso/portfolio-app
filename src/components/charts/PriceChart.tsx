"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

interface PriceDataPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
}

interface PriceChartProps {
  data: PriceDataPoint[];
  avgPrice?: number;
  className?: string;
  showTimeframes?: boolean;
}

type Timeframe = "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "2Y" | "ALL";

const TIMEFRAME_DAYS: Record<Timeframe, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  YTD: -1,
  "1Y": 365,
  "2Y": 730,
  ALL: null,
};

const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  "1W": "1 week",
  "1M": "1 month",
  "3M": "3 months",
  "6M": "6 months",
  YTD: "Year to date",
  "1Y": "1 year",
  "2Y": "2 years",
  ALL: "All time",
};

export function PriceChart({
  data,
  avgPrice,
  className,
  showTimeframes = true,
}: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("YTD");

  const filteredData = useMemo(() => {
    const days = TIMEFRAME_DAYS[timeframe];
    if (days === null) return data;

    let cutoffStr: string;
    if (timeframe === "YTD") {
      cutoffStr = `${new Date().getFullYear()}-01-01`;
    } else {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      cutoffStr = cutoffDate.toISOString().split("T")[0];
    }

    return data.filter((d) => d.date >= cutoffStr);
  }, [data, timeframe]);

  const { minPrice, maxPrice, priceChange, priceChangePercent } = useMemo(() => {
    if (filteredData.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceChange: 0, priceChangePercent: 0 };
    }

    const prices = filteredData.map((d) => d.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;

    const firstPrice = filteredData[0].close;
    const lastPrice = filteredData[filteredData.length - 1].close;
    const change = lastPrice - firstPrice;
    const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;

    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
      priceChange: change,
      priceChangePercent: changePercent,
    };
  }, [filteredData]);

  const isPositive = priceChange >= 0;

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-64 bg-muted/30 rounded-lg",
          className
        )}
      >
        <p className="text-muted-foreground">No price data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showTimeframes && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-[15px] font-bold tabular-nums",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(priceChange)}
            </span>
            <span
              className={cn(
                "font-mono text-[12px] font-semibold tabular-nums",
                isPositive ? "text-gain" : "text-loss"
              )}
            >
              ({isPositive ? "+" : ""}
              {priceChangePercent.toFixed(2)}%)
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Timeframe"
            className="flex w-full gap-1 rounded-xl bg-muted p-1"
          >
            {(Object.keys(TIMEFRAME_DAYS) as Timeframe[]).map((tf) => {
              const selected = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={TIMEFRAME_LABEL[tf]}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "flex-1 rounded-lg border-0 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.03em] transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={filteredData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                const d = new Date(date);
                return d.toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                });
              }}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              className="text-muted-foreground"
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tickFormatter={(value) =>
                value.toLocaleString("es-ES", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })
              }
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={60}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Price"]}
              labelFormatter={(date) =>
                new Date(date).toLocaleDateString("es-ES", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              }
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            {avgPrice !== undefined && (
              <ReferenceLine
                y={avgPrice}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ${formatCurrency(avgPrice)}`,
                  position: "right",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="close"
              stroke={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
