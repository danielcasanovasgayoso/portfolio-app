"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface AllocationItem {
  name: string;
  value: number;
  category?: string;
}

interface AllocationChartProps {
  data: AllocationItem[];
  className?: string;
  showLegend?: boolean;
  title?: string;
}

// High-Growth Indigo color palette
const CATEGORY_COLORS: Record<string, string> = {
  FUNDS: "#6063EE",    // Primary Indigo
  STOCKS: "#00e676",   // Neon Growth Green
  PP: "#818cf8",       // Soft Indigo
  OTHERS: "#A1A1C3",   // Slate
};

// Extended palette for individual holdings
const HOLDING_COLORS = [
  "#6063EE", // Primary Indigo
  "#00e676", // Neon Growth Green
  "#4648D4", // Deep Indigo
  "#818cf8", // Soft Indigo
  "#c084fc", // Bright Purple
  "#34d399", // Emerald
  "#a78bfa", // Violet
  "#6366f1", // Brand Indigo
  "#A1A1C3", // Slate
];

function getColorForItem(item: AllocationItem, index: number): string {
  if (item.category && CATEGORY_COLORS[item.category]) {
    return CATEGORY_COLORS[item.category];
  }
  return HOLDING_COLORS[index % HOLDING_COLORS.length];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      percent: number;
      color: string;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground rounded-lg px-3 py-2 shadow-lg border border-border/10">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-xs font-medium">{data.name}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-mono font-semibold">
          {formatCurrency(data.value)}
        </span>
        <span className="text-xs font-mono opacity-70">
          {data.percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function AllocationChart({
  data,
  className,
  showLegend = true,
  title,
}: AllocationChartProps) {
  const { chartData, total } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    const chartData = data
      .filter((item) => item.value > 0)
      .map((item, index) => ({
        ...item,
        percent: total > 0 ? (item.value / total) * 100 : 0,
        color: getColorForItem(item, index),
      }))
      .sort((a, b) => b.value - a.value);

    return { chartData, total };
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div
        className={cn(
          "bg-transparent flex items-center justify-center h-64",
          className
        )}
      >
        <p className="text-sm font-mono text-muted-foreground">NO DATA</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-transparent animate-slide-up stagger-2 w-full", className)}>
      {/* Header */}
      {title && (
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="label-sm">{title}</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-8 w-full">
        {/* Chart */}
        <div className="h-40 w-40 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={3}
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    style={{
                      filter: "drop-shadow(0 0 6px rgba(0,0,0,0.2))",
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Total
            </span>
            <span className="text-lg font-mono font-bold text-foreground tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="w-full space-y-2">
            {chartData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-foreground truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-muted-foreground">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Category allocation chart using predefined colors
 */
export function CategoryAllocationChart({
  funds,
  stocks,
  pp,
  others,
  className,
}: {
  funds: number;
  stocks: number;
  pp: number;
  others: number;
  className?: string;
}) {
  const data: AllocationItem[] = [
    { name: "Funds", value: funds, category: "FUNDS" },
    { name: "Stocks/ETFs", value: stocks, category: "STOCKS" },
    { name: "Pension Plans", value: pp, category: "PP" },
    { name: "Others", value: others, category: "OTHERS" },
  ].filter((item) => item.value > 0);

  return (
    <AllocationChart
      data={data}
      className={className}
      title="Asset Allocation"
      showLegend={false}
    />
  );
}
