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

// Swiss Terminal color palette - bold, distinct, memorable
const CATEGORY_COLORS: Record<string, string> = {
  FUNDS: "#00f5d4",    // Electric Cyan (Primary)
  STOCKS: "#fbbf24",   // Amber Gold
  PP: "#a78bfa",       // Soft Violet
  OTHERS: "#60a5fa",   // Light Blue
};

// Extended palette for individual holdings
const HOLDING_COLORS = [
  "#00f5d4", // Electric Cyan
  "#fbbf24", // Amber Gold
  "#a78bfa", // Soft Violet
  "#f472b6", // Pink
  "#60a5fa", // Light Blue
  "#34d399", // Emerald
  "#fb7185", // Rose
  "#facc15", // Yellow
  "#818cf8", // Indigo
  "#2dd4bf", // Teal
  "#c084fc", // Purple
  "#38bdf8", // Sky
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
    <div className="terminal-card px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-xs font-medium text-foreground">{data.name}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-mono font-semibold text-foreground">
          {formatCurrency(data.value)}
        </span>
        <span className="text-xs font-mono text-muted-foreground">
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
          "terminal-card flex items-center justify-center h-64",
          className
        )}
      >
        <p className="text-sm font-mono text-muted-foreground">NO DATA</p>
      </div>
    );
  }

  return (
    <div className={cn("terminal-card p-4 animate-slide-up stagger-2", className)}>
      {/* Header */}
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="data-label">{title}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Chart */}
        <div className="h-48 w-48 flex-shrink-0 relative">
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
          <div className="flex-1 space-y-2">
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
    />
  );
}
