import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeroStatProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  cta?: ReactNode;
  /** Mono-number size in px. 46 (dashboard hero) / 38 (transactions, asset detail). */
  size?: 46 | 38 | 32;
  className?: string;
}

export function HeroStat({ label, value, delta, cta, size = 46, className }: HeroStatProps) {
  const valueSize = size === 46 ? "text-[46px]" : size === 38 ? "text-[38px]" : "text-[32px]";
  return (
    <div className={cn("relative px-2 pb-2 text-center text-white", className)}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-white/70">
        {label}
      </div>
      <div
        className={cn(
          "font-mono font-semibold tracking-[-0.03em] tabular-nums text-white",
          valueSize
        )}
      >
        {value}
      </div>
      {delta && <div className="mt-2 flex justify-center">{delta}</div>}
      {cta && <div className="mt-3.5 flex justify-center">{cta}</div>}
    </div>
  );
}
