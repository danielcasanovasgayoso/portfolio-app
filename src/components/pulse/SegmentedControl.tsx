"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  /** Renders white-on-glass when used over the indigo hero. */
  variant?: "default" | "glass";
  /** Mono is used for time-period selectors; sans for general settings. */
  font?: "mono" | "sans";
  ariaLabel?: string;
  className?: string;
  renderLabel?: (option: T) => string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = "default",
  font = "sans",
  ariaLabel,
  className,
  renderLabel,
}: SegmentedControlProps<T>) {
  const trackClass =
    variant === "glass"
      ? "bg-white/[0.12]"
      : "bg-muted";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full gap-1 rounded-xl p-1",
        trackClass,
        className
      )}
    >
      {options.map((option) => {
        const selected = option === value;
        const selectedClass =
          variant === "glass"
            ? selected
              ? "bg-white text-primary"
              : "text-white/85"
            : selected
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground";

        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={cn(
              "flex-1 rounded-lg border-0 py-2 text-[12px] font-semibold transition-colors",
              font === "mono" ? "font-mono tracking-[0.03em] text-[11px]" : "",
              selectedClass
            )}
          >
            {renderLabel ? renderLabel(option) : option}
          </button>
        );
      })}
    </div>
  );
}
