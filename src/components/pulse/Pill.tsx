import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillVariant =
  | "gain"
  | "loss"
  | "neutral"
  | "glass"
  | "type-buy"
  | "type-sell"
  | "type-dividend"
  | "type-fee";

interface PillProps {
  variant?: PillVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Larger pill used inside hero blocks. Default = compact. */
  size?: "sm" | "md";
}

const variantClass: Record<PillVariant, string> = {
  gain: "bg-gain-muted text-gain",
  loss: "bg-loss-muted text-loss",
  neutral: "bg-muted text-muted-foreground",
  glass: "bg-white/[0.18] text-white",
  "type-buy": "bg-primary/10 text-primary",
  "type-sell": "bg-loss-muted text-loss",
  "type-dividend": "bg-gain-muted text-gain",
  "type-fee": "bg-muted text-muted-foreground",
};

export function Pill({ variant = "neutral", icon, children, className, size = "sm" }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono font-semibold tabular-nums",
        size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-1 text-[11px]",
        variantClass[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
