import { cn } from "@/lib/utils";

export interface DonutSlice {
  label: string;
  pct: number;
  color: string;
}

interface DonutProps {
  slices: readonly DonutSlice[];
  size?: number;
  stroke?: number;
  /** Centered label inside the ring (e.g. "€92.5K"). */
  label?: string;
  /** Smaller text under the centered label. */
  sublabel?: string;
  className?: string;
}

export function Donut({
  slices,
  size = 104,
  stroke = 14,
  label,
  sublabel,
  className,
}: DonutProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((s, slice) => s + slice.pct, 0) || 1;

  const segments = slices.reduce<{ slice: DonutSlice; length: number; offset: number }[]>(
    (acc, slice) => {
      const length = (slice.pct / total) * circumference;
      const previous = acc.at(-1);
      const offset = previous ? previous.offset + previous.length : 0;
      acc.push({ slice, length, offset });
      return acc;
    },
    []
  );

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        {segments.map(({ slice, length, offset }) => (
          <circle
            key={slice.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
          {label && (
            <span className="font-mono text-[15px] font-bold tabular-nums">{label}</span>
          )}
          {sublabel && (
            <span className="label-sm mt-0.5">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
