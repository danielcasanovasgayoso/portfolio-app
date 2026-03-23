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
import { Button } from "@/components/ui/button";
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

type Timeframe = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const TIMEFRAME_DAYS: Record<Timeframe, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: null,
};

export function PriceChart({
  data,
  avgPrice,
  className,
  showTimeframes = true,
}: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");

  const filteredData = useMemo(() => {
    const days = TIMEFRAME_DAYS[timeframe];
    if (!days) return data;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

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
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg font-semibold",
                isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(priceChange)}
            </span>
            <span
              className={cn(
                "text-sm",
                isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              ({isPositive ? "+" : ""}
              {priceChangePercent.toFixed(2)}%)
            </span>
          </div>
          <div className="flex gap-1">
            {(Object.keys(TIMEFRAME_DAYS) as Timeframe[]).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
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
