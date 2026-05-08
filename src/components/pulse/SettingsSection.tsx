import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("mt-5", className)}>
      <div className="label-sm px-1 pb-2">{title}</div>
      <div className="overflow-hidden rounded-2xl bg-card ghost-border shadow-sm">
        {children}
      </div>
    </section>
  );
}
