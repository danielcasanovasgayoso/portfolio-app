import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeroHeaderProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function HeroHeader({ left, center, right, className }: HeroHeaderProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-3 px-1 pb-5 pt-2 text-white",
        className
      )}
    >
      <div className="flex min-w-0 items-center">{left}</div>
      <div className="flex min-w-0 flex-1 justify-center text-center">{center}</div>
      <div className="flex items-center justify-end gap-1.5">{right}</div>
    </div>
  );
}
