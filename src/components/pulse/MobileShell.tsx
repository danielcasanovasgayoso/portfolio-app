import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: ReactNode;
  className?: string;
  /** Hides bottom padding when no BottomNav clearance is needed (e.g. auth screens). */
  flush?: boolean;
}

export function MobileShell({ children, className, flush = false }: MobileShellProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md min-h-dvh overflow-x-hidden",
        flush ? "" : "pb-28",
        className
      )}
    >
      {children}
    </div>
  );
}
