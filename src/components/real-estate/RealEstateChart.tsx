"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export interface RealEstateChartPoint {
  date: string;
  balance: number | null;
  marketValue: number | null;
  equity: number | null;
  isValuation?: boolean; // true on real (user-entered) valuation dates
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: RealEstateChartPoint;
}

/** Renders a marker only on real valuation dates; interpolated points stay dotless. */
function ValuationDot({ cx, cy, payload }: DotProps) {
  if (!payload?.isValuation || cx === undefined || cy === undefined) {
    return <g />;
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#10b981"
      stroke="var(--background)"
      strokeWidth={1.5}
    />
  );
}

interface RealEstateChartProps {
  data: RealEstateChartPoint[];
  labels: { balance: string; marketValue: string; equity: string };
}

export function RealEstateChart({ data, labels }: RealEstateChartProps) {
  // Recharts animates SVG attributes (not compositor-friendly): keep the
  // entrance draw short, and skip it under prefers-reduced-motion since
  // the global CSS kill switch can't reach JS-driven animations.
  const prefersReducedMotion = useReducedMotion();
  const lineAnimation = {
    isAnimationActive: !prefersReducedMotion,
    animationDuration: 400,
    animationEasing: "ease-out" as const,
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(date: string) =>
            new Date(date).toLocaleDateString("es-ES", {
              month: "short",
              year: "2-digit",
            })
          }
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          width={70}
          tickFormatter={(value: number) =>
            value.toLocaleString("es-ES", {
              notation: "compact",
              maximumFractionDigits: 1,
            })
          }
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          labelFormatter={(date) =>
            new Date(date as string).toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })
          }
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
        <Line
          type="monotone"
          dataKey="marketValue"
          name={labels.marketValue}
          stroke="#10b981"
          strokeWidth={2}
          dot={<ValuationDot />}
          activeDot={{ r: 5 }}
          connectNulls
          {...lineAnimation}
        />
        <Line
          type="monotone"
          dataKey="balance"
          name={labels.balance}
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          connectNulls
          {...lineAnimation}
        />
        <Line
          type="monotone"
          dataKey="equity"
          name={labels.equity}
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          connectNulls
          {...lineAnimation}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
