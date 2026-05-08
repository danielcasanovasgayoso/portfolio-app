import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  /** Use ambient indigo glow (cards overlapping the hero). Default true. */
  ambient?: boolean;
  /** Removes default padding when set. */
  flush?: boolean;
}

export function SectionCard({
  children,
  className,
  ambient = true,
  flush = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] bg-card text-card-foreground ghost-border",
        ambient ? "shadow-ambient" : "shadow-sm",
        flush ? "" : "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
