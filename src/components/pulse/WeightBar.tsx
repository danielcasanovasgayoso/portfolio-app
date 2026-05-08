import { cn } from "@/lib/utils";

interface WeightBarProps {
  /** 0–100 */
  pct: number;
  positive?: boolean;
  className?: string;
}

export function WeightBar({ pct, positive = true, className }: WeightBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="presentation"
      className={cn("relative h-1 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          positive ? "bg-gain" : "bg-loss"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
