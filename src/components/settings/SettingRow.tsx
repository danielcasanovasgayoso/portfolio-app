import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingRowProps {
  icon?: LucideIcon;
  iconSlot?: React.ReactNode;
  label: string;
  description?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  destructive?: boolean;
}

export function SettingRow({
  icon: Icon,
  iconSlot,
  label,
  description,
  right,
  children,
  destructive = false,
}: SettingRowProps) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        {iconSlot ?? (
          Icon && (
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                destructive ? "bg-destructive/10" : "bg-primary/10"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  destructive ? "text-destructive" : "text-primary"
                )}
              />
            </div>
          )
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[15px] font-semibold leading-tight truncate",
              destructive ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <section>
      <h2 className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
        {children}
      </div>
    </section>
  );
}
